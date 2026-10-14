"use client";

import { Field } from "./Ui";

export interface ContactValue {
  fullName: string;
  passportNo: string;
  email: string;
  phone: string;
  flightNo: string;
}

export function ContactFields<T extends ContactValue>({ value, onChange }: { value: T; onChange: (v: T) => void }) {
  const set = (k: keyof ContactValue, v: string) => onChange({ ...value, [k]: v });
  return (
    <>
      <Field label="Full Name (as on Passport)"><input className="input" value={value.fullName} autoComplete="name" onChange={(e) => set("fullName", e.target.value)} /></Field>
      <Field label="Passport Number"><input className="input" value={value.passportNo} onChange={(e) => set("passportNo", e.target.value.toUpperCase())} /></Field>
      <Field label="Email"><input className="input" type="email" value={value.email} autoComplete="email" onChange={(e) => set("email", e.target.value)} /></Field>
      <Field label="Mobile Number"><input className="input" type="tel" value={value.phone} autoComplete="tel" onChange={(e) => set("phone", e.target.value)} /></Field>
      <Field label="Flight Number"><input className="input" value={value.flightNo} placeholder="AI 906" onChange={(e) => set("flightNo", e.target.value.toUpperCase())} /></Field>
    </>
  );
}

export const contactError = (v: ContactValue) =>
  !v.fullName.trim() || !v.passportNo.trim() || !v.flightNo.trim()
    ? "Please provide your name, passport number and flight number."
    : v.email && !/^\S+@\S+\.\S+$/.test(v.email)
      ? "Please enter a valid email address."
      : "";
