from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from datetime import datetime
from memory.structured.models import Profile
from protogrid import make_response

router = APIRouter()

@router.get("/profile")
async def get_profile():
    """Get the user profile. Create default if not exists."""
    profile = await Profile.find_one()
    
    if not profile:
        # Create default profile if none exists
        profile = Profile(
            name="User",  # Default
            role="User",
            bio="",
            api_keys={},
            preferences={}
        )
        await profile.insert()
        
    return make_response(
        payload=profile.model_dump(mode='json'),
        status=200,
        message="Profile retrieved"
    )

@router.post("/profile")
async def update_profile(updates: Dict[str, Any]):
    """Update user profile fields."""
    profile = await Profile.find_one()
    if not profile:
        profile = Profile()
        await profile.insert()
    
    # Update fields
    if "name" in updates:
        profile.name = updates["name"]
    if "role" in updates:
        profile.role = updates["role"]
    if "bio" in updates:
        profile.bio = updates["bio"]
    if "api_keys" in updates and isinstance(updates["api_keys"], dict):
        # Merge keys
        current_keys = profile.api_keys or {}
        current_keys.update(updates["api_keys"])
        profile.api_keys = current_keys
    if "preferences" in updates and isinstance(updates["preferences"], dict):
        current_prefs = profile.preferences or {}
        current_prefs.update(updates["preferences"])
        profile.preferences = current_prefs
        
    profile.updated_at = datetime.utcnow()
    await profile.save()
    
    return make_response(
        payload=profile.model_dump(mode='json'),
        status=200,
        message="Profile updated"
    )
