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
    <div className="rounded-xl border bg-slate-50 p-4">
      <h2 className="font-bold">客戶資料</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">姓名
          <input className="mt-1 w-full rounded-lg border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-sm font-medium">電話
          <input className="mt-1 w-full rounded-lg border px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="text-sm font-medium sm:col-span-2">地址
          <input className="mt-1 w-full rounded-lg border px-3 py-2" value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <label className="text-sm font-medium sm:col-span-2">備註
          <textarea className="mt-1 w-full rounded-lg border px-3 py-2" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      <button className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-white" type="button" onClick={save}>儲存資料</button>
      {message ? <span className="ml-3 text-sm text-slate-600">{message}</span> : null}
    </div>
  );
}
