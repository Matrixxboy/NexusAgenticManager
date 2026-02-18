"""
GitHub Integration — NEXUS
Used by ATLAS to sync repos, issues, and commits.
"""
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from loguru import logger
from config import settings


class GitHubClient:
    """
    Wrapper around PyGithub for NEXUS integrations.
    Lazy-loads to avoid import errors if PyGithub not installed.
    """

    def __init__(self):
        self._github = None
        self._user = None

    def _get_client(self):
        if self._github is None:
            if not settings.github_token:
                raise RuntimeError("GITHUB_TOKEN not set in .env")
            from github import Github
            self._github = Github(settings.github_token)
            self._user = self._github.get_user(settings.github_username)
            logger.info(f"GitHub connected as: {settings.github_username}")
        return self._github, self._user

    async def list_repos(self, limit: int = 20) -> List[Dict[str, Any]]:
        """List user's repositories sorted by last updated."""
        _, user = self._get_client()
        repos = []
        for repo in user.get_repos(sort="updated")[:limit]:
            repos.append({
                "name": repo.name,
                "full_name": repo.full_name,
                "description": repo.description or "",
                "url": repo.html_url,
                "language": repo.language or "unknown",
                "stars": repo.stargazers_count,
                "open_issues": repo.open_issues_count,
                "updated_at": repo.updated_at.isoformat() if repo.updated_at else "",
                "private": repo.private,
            })
        return repos

    async def get_open_issues(self, repo_name: str) -> List[Dict[str, Any]]:
        """Get all open issues for a repo."""
        gh, _ = self._get_client()
        try:
            repo = gh.get_repo(f"{settings.github_username}/{repo_name}")
            issues = []
            for issue in repo.get_issues(state="open"):
                issues.append({
                    "number": issue.number,
                    "title": issue.title,
                    "body": (issue.body or "")[:500],
                    "labels": [l.name for l in issue.labels],
                    "created_at": issue.created_at.isoformat(),
                    "url": issue.html_url,
                })
            return issues
        except Exception as e:
            logger.error(f"GitHub get_open_issues error: {e}")
            return []

    async def create_issue(
        self,
        repo_name: str,
        title: str,
        body: str = "",
        labels: List[str] = [],
    ) -> Dict[str, Any]:
        """Create a GitHub issue from NEXUS tasks."""
        gh, _ = self._get_client()
        try:
            repo = gh.get_repo(f"{settings.github_username}/{repo_name}")
            issue = repo.create_issue(title=title, body=body)
            logger.info(f"GitHub issue created: #{issue.number} in {repo_name}")
            return {"number": issue.number, "url": issue.html_url, "success": True}
        except Exception as e:
            logger.error(f"GitHub create_issue error: {e}")
            return {"success": False, "error": str(e)}

    async def close_issue(self, repo_name: str, issue_number: int) -> bool:
        """Close an issue when NEXUS task is marked done."""
        gh, _ = self._get_client()
        try:
            repo = gh.get_repo(f"{settings.github_username}/{repo_name}")
            issue = repo.get_issue(issue_number)
            issue.edit(state="closed")
            logger.info(f"GitHub issue closed: #{issue_number} in {repo_name}")
            return True
        except Exception as e:
            logger.error(f"GitHub close_issue error: {e}")
            return False

    async def get_recent_commits(
        self,
        repo_name: str,
        days: int = 7,
    ) -> List[Dict[str, Any]]:
        """Get recent commits for activity tracking."""
        gh, _ = self._get_client()
        try:
            repo = gh.get_repo(f"{settings.github_username}/{repo_name}")
            since = datetime.utcnow() - timedelta(days=days)
            commits = []
            for commit in repo.get_commits(since=since):
                commits.append({
                    "sha": commit.sha[:7],
                    "message": commit.commit.message.split("\n")[0][:100],
                    "date": commit.commit.author.date.isoformat(),
                    "url": commit.html_url,
                })
            return commits
        except Exception as e:
            logger.error(f"GitHub get_recent_commits error: {e}")
            return []

    async def get_project_summary(self, repo_name: str) -> Dict[str, Any]:
        """Full summary of a repo — used by ATLAS for briefings."""
        gh, _ = self._get_client()
        try:
            repo = gh.get_repo(f"{settings.github_username}/{repo_name}")
            recent_commits = await self.get_recent_commits(repo_name, days=3)
            open_issues = await self.get_open_issues(repo_name)

            return {
                "name": repo.name,
                "description": repo.description or "",
                "open_issues": len(open_issues),
                "recent_commits": len(recent_commits),
                "last_commit": recent_commits[0]["message"] if recent_commits else "None",
                "issues": open_issues[:5],  # top 5
                "url": repo.html_url,
            }
        except Exception as e:
            logger.error(f"GitHub project_summary error: {e}")
            return {"error": str(e)}

    def is_configured(self) -> bool:
        return bool(settings.github_token and settings.github_username)


github_client = GitHubClient()
