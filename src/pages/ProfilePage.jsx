import { useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import "./ProfilePage.css";

export default function ProfilePage({ user, onBack }) {
  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";

  const avatarUrl = user?.user_metadata?.avatar_url || null;
  const avatarInitials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const [newName, setNewName] = useState(displayName);
  const [nameMsg, setNameMsg] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState(avatarUrl);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarMsg, setAvatarMsg] = useState("");
  const [avatarSaving, setAvatarSaving] = useState(false);
  const fileInputRef = useRef();

  async function handleSaveName(e) {
    e.preventDefault();
    if (!newName.trim()) { setNameMsg("Name cannot be empty."); return; }
    setNameSaving(true); setNameMsg("");
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: newName.trim() },
      });
      if (error) throw error;
      setNameMsg("Display name updated!");
    } catch (err) {
      setNameMsg(`${err.message}`);
    } finally {
      setNameSaving(false);
    }
  }

  async function handleSavePassword(e) {
    e.preventDefault();
    if (!newPw) { setPwMsg("Enter a new password."); return; }
    if (newPw.length < 6) { setPwMsg("Password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setPwMsg("Passwords don't match."); return; }
    setPwSaving(true); setPwMsg("");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setPwMsg("Password changed successfully!");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      setPwMsg(`${err.message}`);
    } finally {
      setPwSaving(false);
    }
  }

  function handleAvatarPick(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setAvatarMsg("Please pick an image file."); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarMsg("");
  }

  async function handleSaveAvatar(e) {
    e.preventDefault();
    if (!avatarFile) { setAvatarMsg("Pick an image first."); return; }
    setAvatarSaving(true); setAvatarMsg("");
    try {
      const ext = avatarFile.name.split(".").pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: updateErr } = await supabase.auth.updateUser({
        data: { avatar_url: data.publicUrl },
      });
      if (updateErr) throw updateErr;
      setAvatarMsg("Profile picture updated!");
    } catch (err) {
      setAvatarMsg(`${err.message}`);
    } finally {
      setAvatarSaving(false);
    }
  }

  return (
    <div className="profile-overlay">
      <div className="profile-page">
        <div className="profile-header">
          <button className="profile-back-btn" onClick={onBack}>
            ← Back
          </button>
          <h1 className="profile-title">
            Thrift<span className="profile-title-green">Verse</span>
          </h1>
          <span className="profile-subtitle">My Profile</span>
        </div>

        <div className="profile-body">
          <section className="profile-section">
            <h2 className="profile-section-title">Profile Picture</h2>
            <div className="profile-avatar-row">
              <div
                className="profile-avatar-circle"
                onClick={() => fileInputRef.current.click()}
                title="Click to change photo"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="profile-avatar-img" />
                ) : (
                  <span className="profile-avatar-initials">{avatarInitials}</span>
                )}
                <div className="profile-avatar-overlay">📷</div>
              </div>
              <div className="profile-avatar-actions">
                <p className="profile-avatar-hint">Click the photo to select a new one.</p>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleAvatarPick}
                />
                <button
                  className="profile-save-btn"
                  onClick={handleSaveAvatar}
                  disabled={avatarSaving || !avatarFile}
                >
                  {avatarSaving ? "Saving…" : "Save Photo"}
                </button>
                {avatarMsg && (
                  <p className={`profile-msg ${avatarMsg.startsWith("✅") ? "success" : "error"}`}>
                    {avatarMsg}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="profile-section">
            <h2 className="profile-section-title">Display Name</h2>
            <form onSubmit={handleSaveName} className="profile-form">
              <input
                className="profile-input"
                type="text"
                placeholder="Your display name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <button className="profile-save-btn" type="submit" disabled={nameSaving}>
                {nameSaving ? "Saving…" : "Save Name"}
              </button>
              {nameMsg && (
                <p className={`profile-msg ${nameMsg ? "success" : "error"}`}>
                  {nameMsg}
                </p>
              )}
            </form>
          </section>

          <section className="profile-section">
            <h2 className="profile-section-title">Change Password</h2>
            <form onSubmit={handleSavePassword} className="profile-form">
              <label className="profile-label">New Password</label>
              <input
                className="profile-input"
                type="password"
                placeholder="New password (min 6 chars)"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
              <label className="profile-label">Confirm New Password</label>
              <input
                className="profile-input"
                type="password"
                placeholder="Confirm new password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
              <button className="profile-save-btn" type="submit" disabled={pwSaving}>
                {pwSaving ? "Saving…" : "Update Password"}
              </button>
              {pwMsg && (
                <p className={`profile-msg ${pwMsg ? "success" : "error"}`}>
                  {pwMsg}
                </p>
              )}
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
