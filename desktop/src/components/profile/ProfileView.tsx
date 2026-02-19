import { useState, useEffect, useCallback } from "react"
import { useNexusStore } from "../../store/nexusStore"
import { getProfile, updateProfile } from "../../lib/api"

interface Profile {
  name: string
  role: string
  bio: string
  api_keys: Record<string, string>
  preferences: Record<string, any>
}

const API_KEY_FIELDS = [
  { key: "openai", label: "OpenAI API Key" },
  { key: "anthropic", label: "Anthropic API Key" },
  { key: "openrouter", label: "OpenRouter Key" },
  { key: "google", label: "Google Gemini Key" },
  { key: "groq", label: "Groq API Key" },
]

export default function ProfileView() {
  const { pushNotification } = useNexusStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [profile, setProfile] = useState<Profile>({
    name: "",
    role: "",
    bio: "",
    api_keys: {},
    preferences: {},
  })

  const loadProfile = useCallback(async () => {
    try {
      const data = await getProfile()
      setProfile(data)
    } catch {
      pushNotification({
        type: "error",
        title: "Profile Error",
        body: "Failed to load profile data",
      })
    } finally {
      setLoading(false)
    }
  }, [pushNotification])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateProfile(profile)
      setProfile(updated)

      pushNotification({
        type: "success",
        title: "Profile Saved",
        body: "Your profile has been updated",
      })
    } catch {
      pushNotification({
        type: "error",
        title: "Save Failed",
        body: "Could not update profile",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChange = <K extends keyof Profile>(
    field: K,
    value: Profile[K],
  ) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  const handleKeyChange = (key: string, value: string) => {
    setProfile((prev) => ({
      ...prev,
      api_keys: { ...prev.api_keys, [key]: value },
    }))
  }

  if (loading) return <div className="p-8 text-dim">Loading profile...</div>

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-border flex items-center justify-between">
        <h1 className="text-xl font-display font-bold tracking-wide">
          Profile & Keys
        </h1>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-5 py-2 rounded-md text-xs font-mono tracking-widest transition-all ${
            saving
              ? "text-dim cursor-not-allowed"
              : "bg-accent text-white hover:brightness-110"
          }`}
        >
          {saving ? "SAVING..." : "SAVE CHANGES"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 max-w-2xl">
        <div className="space-y-8">
          {/* Identity */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold font-display text-accent">
              Identity
            </h2>

            <div className="bg-white p-6 rounded-lg border border-border space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="mono-label">DISPLAY NAME</label>
                  <input
                    value={profile.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="w-full p-2 text-black bg-surface border border-border rounded text-sm font-mono focus:border-accent outline-none"
                    placeholder="Your Name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="mono-label">ROLE / TITLE</label>
                  <input
                    value={profile.role}
                    onChange={(e) => handleChange("role", e.target.value)}
                    className="w-full p-2 text-black bg-surface border border-border rounded text-sm font-mono focus:border-accent outline-none"
                    placeholder="e.g. AI Engineer"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="mono-label">BIO / CONTEXT</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  className="w-full p-3 text-black bg-surface border border-border rounded text-sm font-mono focus:border-accent outline-none h-24 resize-none"
                  placeholder="Short bio for agent context..."
                />
                <p className="text-xs text-dim">
                  Used by agents to understand your background.
                </p>
              </div>
            </div>
          </section>

          {/* API Keys */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-display text-accent">
                API Keys
              </h2>
              <span className="text-xs bg-surface3 text-black px-2 py-0.5 rounded">
                Stored Securely
              </span>
            </div>

            <div className="bg-white p-6 rounded-lg border border-border space-y-4">
              {API_KEY_FIELDS.map((item) => (
                <div key={item.key} className="space-y-2">
                  <label className="mono-label">{item.label}</label>

                  <div className="relative">
                    <input
                      type="password"
                      value={profile.api_keys?.[item.key] || ""}
                      onChange={(e) =>
                        handleKeyChange(item.key, e.target.value)
                      }
                      className="w-full p-2 text-black bg-surface border border-border rounded text-sm font-mono focus:border-accent outline-none pr-16"
                      placeholder="••••••••"
                    />

                    {profile.api_keys?.[item.key] && (
                      <button
                        onClick={() => handleKeyChange(item.key, "")}
                        className="absolute right-3 top-2 text-red-500 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
