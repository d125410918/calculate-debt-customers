"use client";

import { useState } from "react";

type Props = {
  slug: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    note: string | null;
  };
};

export default function CustomerEditor({ slug, customer }: Props) {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [address, setAddress] = useState(customer.address ?? "");
  const [note, setNote] = useState(customer.note ?? "");
  const [message, setMessage] = useState("");

  async function save() {
    setMessage("儲存中");
    const response = await fetch(`/api/u/${slug}/customers/${customer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, address, note })
    });
    setMessage(response.ok ? "已儲存" : "儲存失敗");
  }

  return (
    <div className="app-grid">
      <label className="app-label">姓名<input className="app-input" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="app-label">電話<input className="app-input" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
      <label className="app-label">地址<input className="app-input" value={address} onChange={(e) => setAddress(e.target.value)} /></label>
      <label className="app-label">備註<textarea className="app-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <button className="app-button primary full" type="button" onClick={save}>儲存資料</button>
      {message ? <p className="app-subtitle">{message}</p> : null}
    </div>
  );
}
