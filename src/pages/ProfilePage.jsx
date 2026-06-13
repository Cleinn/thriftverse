import { useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import "./ProfilePage.css";

export default function ProfilePage({ user, onBack, onUserUpdate }) {
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
  const [nameMsgType, setNameMsgType] = useState("error");
  const [nameSaving, setNameSaving] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwMsgType, setPwMsgType] = useState("error");
  const [pwSaving, setPwSaving] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState(avatarUrl);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarMsg, setAvatarMsg] = useState("");
  const [avatarMsgType, setAvatarMsgType] = useState("error");
  const [avatarSaving, setAvatarSaving] = useState(false);
  const fileInputRef = useRef();

  function compressImage(file, maxWidth = 256, quality = 0.8) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => resolve(blob), "image/webp", quality);
      };
      img.src = url;
    });
  }

async function handleSaveName(e) {
  e.preventDefault();
  if (!newName.trim()) {
    setNameMsg("Name cannot be empty.");
    setNameMsgType("error");
    return;
  }
  setNameSaving(true); setNameMsg("");
  try {
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: newName.trim() },
    });
    if (authError) throw authError;

    const { error: profileError, count } = await supabase
      .from("profiles")
      .update({ username: newName.trim() }, { count: "exact" })
      .eq("id", user.id);

    if (profileError) throw profileError;
    if (count === 0) throw new Error("Profile update blocked — check RLS policy.");

    await onUserUpdate();
    setNameMsg("Display name updated!");
    setNameMsgType("success");
  } catch (err) {
    setNameMsg(err.message);
    setNameMsgType("error");
  } finally {
    setNameSaving(false);
  }
}

  async function handleSavePassword(e) {
    e.preventDefault();
    if (!currentPw) { 
      setPwMsg("Enter your current password.");
      setPwMsgType("error");
      return; 
    }
    if (!newPw) { 
      setPwMsg("Enter a new password.");
      setPwMsgType("error");
      return; 
    }
    if (newPw.length < 6) { 
      setPwMsg("Password must be at least 6 characters."); 
      setPwMsgType("error");
      return; 
    }
    if (newPw !== confirmPw) { 
      setPwMsg("Passwords don't match."); 
      setPwMsgType("error");
      return; 
    }
    if (currentPw === newPw) { 
      setPwMsg("New password must be different from current.");
      setPwMsgType("error");
      return; 
    }

    setPwSaving(true); setPwMsg("");
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPw,
      });
      if (signInErr) {
        setPwMsg("Current password is incorrect.");
        setPwMsgType("error");
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
      if (updateErr) throw updateErr;

      setPwMsg("Password changed successfully!"); setPwMsgType("success");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      setPwMsg(`${err.message}`); setPwMsgType("error");
    } finally {
      setPwSaving(false);
    }
  }

  function handleAvatarPick(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { 
      setAvatarMsg("Please pick an image file.");
      setAvatarMsgType("error");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarMsg("");
  }

  async function handleSaveAvatar(e) {
    e.preventDefault();
    if (!avatarFile) {
      setAvatarMsg("Pick an image first.");
      setAvatarMsgType("error");
      return;
    }
    setAvatarSaving(true); setAvatarMsg("");
    try {
      const compressed = await compressImage(avatarFile);
      const path = `${user.id}.webp`;
      
      await supabase.storage.from("avatars").remove([
        `${user.id}.webp`,
        `${user.id}.jpg`,
        `${user.id}.png`,
        `avatars/${user.id}.webp`,
        `avatars/${user.id}.jpg`,
        `avatars/${user.id}.png`,
      ]);

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, {
          contentType: "image/webp",
          cacheControl: "3600",
        });
      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrlWithBust = `${data.publicUrl}?t=${Date.now()}`;

      const { error: updateErr } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrlWithBust },
      });
      if (updateErr) throw updateErr;

      await onUserUpdate();

      setAvatarPreview(avatarUrlWithBust);
      setAvatarFile(null);
      setAvatarMsg("Profile picture updated!");
      setAvatarMsgType("success");

    } catch (err) {
      setAvatarMsg(`${err.message}`);
      setAvatarMsgType("error");
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
                <div className="profile-avatar-overlay"></div>
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
                  <p className={`profile-msg ${avatarMsgType}`}>
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
                <p className={`profile-msg ${nameMsgType}`}>
                  {nameMsg}
                </p>
              )}
            </form>
          </section>

          <section className="profile-section">
            <h2 className="profile-section-title">Change Password</h2>
            <form onSubmit={handleSavePassword} className="profile-form">
              <label className="profile-label">Current Password</label>
              <input
                className="profile-input"
                type="password"
                placeholder="Enter current password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
              />
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
                <p className={`profile-msg ${pwMsgType}`}>
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
