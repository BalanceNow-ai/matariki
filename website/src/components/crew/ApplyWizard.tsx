"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { upload } from "@vercel/blob/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import {
  applicationSchema,
  CV_MAX_BYTES,
  NIGHT_WATCHES,
  QUALIFICATIONS,
  ROLES,
  SEASICKNESS,
  SKILLS,
  STEP_FIELDS,
  type ApplicationData,
  type ApplicationInput,
} from "@/lib/crew/schema";
import { COUNTRIES } from "@/lib/crew/countries";
import type { Passage } from "@/lib/crew/types";
import { useTurnstile } from "./Turnstile";
import { saveSession } from "./session";

export const FORM_STORAGE_KEY = "crew:application-form";

const STEPS = [
  { id: "about", title: "About you" },
  { id: "experience", title: "Experience" },
  { id: "logistics", title: "Logistics" },
] as const;

const EMPTY: ApplicationInput = {
  fullName: "",
  email: "",
  phone: "",
  homeBase: "",
  nationality: [],
  totalMiles: "",
  offshoreMiles: "",
  longestPassage: "",
  nightWatches: undefined as unknown as ApplicationInput["nightWatches"],
  largestBoatFt: "",
  roles: [],
  qualifications: [],
  otherQualifications: "",
  skills: [],
  passages: [],
  availabilityNotes: "",
  seasickness: undefined as unknown as ApplicationInput["seasickness"],
  swimmer: false,
  safetyNotes: "",
  dietary: "",
  catAllergy: false,
  motivation: "",
  referees: [],
  consentPrivacy: false as unknown as true,
  consentAiInterview: false as unknown as true,
};

const label = "block text-caption text-mist mb-2";
const box =
  "w-full px-4 py-3 bg-midnight-blue/50 border border-mist/20 text-salt-white placeholder:text-storm-grey focus:outline-none focus:border-copper-accent transition-colors";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-2 text-xs text-warning-red">{message}</p> : null;
}

function CheckboxGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={name}>
      {options.map((opt) => {
        const on = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== opt) : [...value, opt])}
            className={cn(
              "px-3 py-2 text-sm border transition-colors capitalize",
              on ? "border-copper-accent text-copper-accent bg-copper-accent/10" : "border-mist/20 text-mist hover:border-mist/50"
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function NationalityPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const match = COUNTRIES.find((c) => c.toLowerCase() === draft.trim().toLowerCase());
    if (match && !value.includes(match) && value.length < 4) onChange([...value, match]);
    setDraft("");
  };
  return (
    <div>
      <div className="flex gap-2">
        <input
          list="crew-countries"
          className={box}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Start typing a country"
          aria-label="Add nationality"
        />
        <Button variant="ghost" size="sm" onClick={add}>
          Add
        </Button>
      </div>
      <datalist id="crew-countries">
        {COUNTRIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {value.map((c) => (
            <span key={c} className="inline-flex items-center gap-2 px-3 py-1 text-sm border border-copper-accent/50 text-salt-white">
              {c}
              <button type="button" aria-label={`Remove ${c}`} className="text-mist hover:text-warning-red" onClick={() => onChange(value.filter((v) => v !== c))}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function loadSaved(): Partial<ApplicationInput> | null {
  try {
    const raw = sessionStorage.getItem(FORM_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<ApplicationInput>) : null;
  } catch {
    return null;
  }
}

export function ApplyWizard({ passages, preselect }: { passages: Passage[]; preselect?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [cv, setCv] = useState<File | null>(null);
  const [cvError, setCvError] = useState<string>();
  const [status, setStatus] = useState<"idle" | "submitting" | "uploading">("idle");
  const [submitError, setSubmitError] = useState<string>();
  const { containerRef, getToken } = useTurnstile();
  const openIds = useMemo(() => new Set(passages.map((p) => p._id)), [passages]);
  const topRef = useRef<HTMLDivElement>(null);

  const form = useForm<ApplicationInput, unknown, ApplicationData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: EMPTY,
    mode: "onTouched",
  });
  const { register, control, handleSubmit, trigger, reset, watch, formState } = form;
  const errors = formState.errors;
  const referees = useFieldArray({ control, name: "referees" });

  // Restore a half-finished form from this tab, then apply ?passage=.
  useEffect(() => {
    const saved = loadSaved();
    const base = { ...EMPTY, ...(saved ?? {}) };
    const chosen = (base.passages ?? []).filter((id) => openIds.has(id));
    if (preselect && openIds.has(preselect) && !chosen.includes(preselect)) chosen.push(preselect);
    reset({ ...base, passages: chosen });
  }, [reset, preselect, openIds]);

  useEffect(() => {
    const sub = watch((values) => {
      try {
        sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(values));
      } catch {
        /* storage full or disabled: the form still works */
      }
    });
    return () => sub.unsubscribe();
  }, [watch]);

  const goTo = (i: number) => {
    setStep(i);
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const next = async () => {
    const fields = STEP_FIELDS[STEPS[step].id] as readonly FieldPath<ApplicationInput>[];
    if (await trigger(fields as FieldPath<ApplicationInput>[], { shouldFocus: true })) goTo(step + 1);
  };

  const pickCv = (file: File | null) => {
    setCvError(undefined);
    if (!file) return setCv(null);
    const ok = /\.(pdf|docx)$/i.test(file.name);
    if (!ok) return setCvError("PDF or Word (.docx) only");
    if (file.size > CV_MAX_BYTES) return setCvError("5 MB at most");
    setCv(file);
  };

  const onSubmit = async (data: ApplicationData) => {
    setSubmitError(undefined);
    setStatus("submitting");
    try {
      const res = await fetch("/api/crew/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnstileToken: await getToken(), application: data }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Something went wrong. Please try again.");
      const { applicationId, sessionToken, expiresInSeconds } = body as {
        applicationId: string;
        sessionToken: string;
        expiresInSeconds: number;
      };
      saveSession({ applicationId, sessionToken, expiresAt: Date.now() + expiresInSeconds * 1000 });

      if (cv) {
        setStatus("uploading");
        try {
          const safeName = cv.name.replace(/[^\w.-]+/g, "_").slice(-80);
          const blob = await upload(`crew-cv/${applicationId}/${safeName}`, cv, {
            access: "private",
            handleUploadUrl: "/api/crew/upload-token",
            clientPayload: JSON.stringify({ turnstileToken: await getToken() }),
            headers: { "x-crew-session": sessionToken },
            contentType: cv.type || undefined,
          });
          const attach = await fetch(`/api/crew/applications/${applicationId}/cv`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-crew-session": sessionToken },
            body: JSON.stringify({ pathname: blob.pathname, fileName: cv.name }),
          });
          if (!attach.ok) throw new Error((await attach.json().catch(() => ({}))).error || "CV upload failed");
        } catch (e) {
          // The application is saved; a failed CV shouldn't block the interview.
          console.error(e);
          sessionStorage.setItem("crew:cv-warning", e instanceof Error ? e.message : "CV upload failed");
        }
      }

      sessionStorage.removeItem(FORM_STORAGE_KEY);
      router.push("/crew/apply/interview");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong");
      setStatus("idle");
    }
  };

  const motivation = watch("motivation") ?? "";

  return (
    <div ref={topRef} className="scroll-mt-28">
      <ol className="flex gap-2 mb-10" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex-1">
            <div className={cn("h-1 mb-2", i <= step ? "bg-copper-accent" : "bg-mist/20")} />
            <span className={cn("text-caption", i === step ? "text-copper-accent" : "text-mist")}>
              {i + 1}. {s.title}
            </span>
          </li>
        ))}
      </ol>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
        {step === 0 && (
          <fieldset className="space-y-6">
            <legend className="text-h3 text-salt-white mb-4">About you</legend>
            <Input label="Full name" autoComplete="name" {...register("fullName")} error={errors.fullName?.message} />
            <Input label="Email" type="email" autoComplete="email" {...register("email")} error={errors.email?.message} />
            <Input label="Phone (optional)" type="tel" autoComplete="tel" {...register("phone")} error={errors.phone?.message} />
            <Input label="Home base" placeholder="e.g. Auckland, NZ" {...register("homeBase")} error={errors.homeBase?.message} />
            <div>
              <span className={label}>Nationality (passport for visas)</span>
              <Controller
                control={control}
                name="nationality"
                render={({ field }) => <NationalityPicker value={field.value ?? []} onChange={field.onChange} />}
              />
              <FieldError message={errors.nationality?.message} />
            </div>
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="space-y-6">
            <legend className="text-h3 text-salt-white mb-4">Experience</legend>
            <div className="grid gap-6 md:grid-cols-2">
              <Input label="Total miles sailed" inputMode="numeric" {...register("totalMiles")} error={errors.totalMiles?.message} />
              <Input label="Offshore miles (60+ nm from land)" inputMode="numeric" {...register("offshoreMiles")} error={errors.offshoreMiles?.message} />
            </div>
            <div>
              <label className={label} htmlFor="longestPassage">Longest passage</label>
              <textarea id="longestPassage" rows={2} className={box} placeholder="Route, days at sea, boat, your role" {...register("longestPassage")} />
              <FieldError message={errors.longestPassage?.message} />
            </div>
            <div>
              <span className={label}>Night watches stood</span>
              <div className="flex flex-wrap gap-4">
                {NIGHT_WATCHES.map((v) => (
                  <label key={v} className="flex items-center gap-2 text-mist">
                    <input type="radio" value={v} {...register("nightWatches")} className="accent-copper-accent" /> {v}
                  </label>
                ))}
              </div>
              <FieldError message={errors.nightWatches?.message} />
            </div>
            <Input label="Largest boat sailed, feet (optional)" inputMode="numeric" {...register("largestBoatFt")} error={errors.largestBoatFt?.message} />
            <div>
              <span className={label}>Roles you have held</span>
              <Controller control={control} name="roles" render={({ field }) => <CheckboxGroup name="Roles" options={ROLES} value={field.value ?? []} onChange={field.onChange} />} />
              <FieldError message={errors.roles?.message} />
            </div>
            <div>
              <span className={label}>Qualifications</span>
              <Controller control={control} name="qualifications" render={({ field }) => <CheckboxGroup name="Qualifications" options={QUALIFICATIONS} value={field.value ?? []} onChange={field.onChange} />} />
            </div>
            <Input label="Other qualifications (optional)" {...register("otherQualifications")} error={errors.otherQualifications?.message} />
            <div>
              <span className={label}>Skills you would bring</span>
              <Controller control={control} name="skills" render={({ field }) => <CheckboxGroup name="Skills" options={SKILLS} value={field.value ?? []} onChange={field.onChange} />} />
            </div>
            <div>
              <label className={label} htmlFor="cv">Sailing CV (optional, PDF or .docx, up to 5 MB)</label>
              <input
                id="cv"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => pickCv(e.target.files?.[0] ?? null)}
                className="text-mist text-sm file:mr-4 file:px-4 file:py-2 file:border file:border-mist/30 file:bg-transparent file:text-salt-white"
              />
              {cv && <p className="mt-2 text-sm text-mist">Selected: {cv.name}</p>}
              <FieldError message={cvError} />
              <p className="mt-2 text-xs text-storm-grey">Files can&apos;t be kept between visits, so please re-select it if you reload.</p>
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="space-y-6">
            <legend className="text-h3 text-salt-white mb-4">Logistics</legend>
            <div>
              <span className={label}>Passages you&apos;d like to join</span>
              {passages.length === 0 ? (
                <p className="text-mist">No passages are open right now.</p>
              ) : (
                <Controller
                  control={control}
                  name="passages"
                  render={({ field }) => (
                    <div className="space-y-2">
                      {passages.map((p) => {
                        const on = (field.value ?? []).includes(p._id);
                        return (
                          <label key={p._id} className={cn("flex items-start gap-3 p-3 border cursor-pointer", on ? "border-copper-accent" : "border-mist/20")}>
                            <input
                              type="checkbox"
                              className="mt-1 accent-copper-accent"
                              checked={on}
                              onChange={() => field.onChange(on ? field.value.filter((v: string) => v !== p._id) : [...(field.value ?? []), p._id])}
                            />
                            <span>
                              <span className="text-salt-white">{p.title}</span>
                              <span className="block text-sm text-mist">
                                {p.route ? `${p.route} · ` : ""}
                                {p.startDate ?? "dates TBC"} · {p.type}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                />
              )}
              <FieldError message={errors.passages?.message} />
            </div>
            <div>
              <label className={label} htmlFor="availabilityNotes">Availability notes (optional)</label>
              <textarea id="availabilityNotes" rows={2} className={box} {...register("availabilityNotes")} />
            </div>
            <div>
              <span className={label}>Seasickness</span>
              <div className="flex flex-wrap gap-4">
                {SEASICKNESS.map((v) => (
                  <label key={v} className="flex items-center gap-2 text-mist capitalize">
                    <input type="radio" value={v} {...register("seasickness")} className="accent-copper-accent" /> {v}
                  </label>
                ))}
              </div>
              <FieldError message={errors.seasickness?.message} />
            </div>
            <label className="flex items-center gap-3 text-mist">
              <input type="checkbox" className="accent-copper-accent" {...register("swimmer")} /> I can swim confidently
            </label>
            <div>
              <label className={label} htmlFor="safetyNotes">Anything about safety we should know? (optional)</label>
              <textarea id="safetyNotes" rows={2} className={box} {...register("safetyNotes")} />
              <p className="mt-2 text-xs text-storm-grey">No medical details needed yet — Greg will talk that through with you if you&apos;re selected.</p>
            </div>
            <Input label="Dietary requirements (optional)" {...register("dietary")} error={errors.dietary?.message} />
            <label className="flex items-center gap-3 text-mist">
              <input type="checkbox" className="accent-copper-accent" {...register("catAllergy")} /> I&apos;m allergic to cats (there&apos;s a ship&apos;s cat aboard)
            </label>
            <div>
              <label className={label} htmlFor="motivation">Why do you want to sail on Matariki III?</label>
              <textarea id="motivation" rows={6} maxLength={1000} className={box} {...register("motivation")} />
              <div className="flex justify-between">
                <FieldError message={errors.motivation?.message} />
                <span className="mt-2 text-xs text-storm-grey ml-auto">{motivation.length}/1000</span>
              </div>
            </div>

            <div>
              <span className={label}>Referees (up to 3, optional)</span>
              <div className="space-y-4">
                {referees.fields.map((f, i) => (
                  <div key={f.id} className="grid gap-3 md:grid-cols-2 p-4 border border-mist/10">
                    <Input label="Name" {...register(`referees.${i}.name`)} error={errors.referees?.[i]?.name?.message} />
                    <Input label="Email or phone" {...register(`referees.${i}.contact`)} error={errors.referees?.[i]?.contact?.message} />
                    <Input label="Boat (optional)" {...register(`referees.${i}.boat`)} />
                    <Input label="Year (optional)" {...register(`referees.${i}.year`)} />
                    <button type="button" className="text-sm text-mist hover:text-warning-red text-left" onClick={() => referees.remove(i)}>
                      Remove referee
                    </button>
                  </div>
                ))}
              </div>
              {referees.fields.length < 3 && (
                <Button variant="ghost" size="sm" className="mt-4" onClick={() => referees.append({ name: "", contact: "", boat: "", year: "" })}>
                  Add referee
                </Button>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-mist/10">
              <label className="flex items-start gap-3 text-mist">
                <input type="checkbox" className="mt-1 accent-copper-accent" {...register("consentPrivacy")} />
                <span>
                  I agree to Matariki III keeping this application privately for crew selection, as described in the privacy note on the{" "}
                  <a href="/crew#privacy" className="text-copper-accent hover:underline">crew page</a>.
                </span>
              </label>
              <FieldError message={errors.consentPrivacy?.message} />
              <label className="flex items-start gap-3 text-mist">
                <input type="checkbox" className="mt-1 accent-copper-accent" {...register("consentAiInterview")} />
                <span>
                  I understand the next step is a short interview with an AI assistant. It asks about my experience and writes a
                  summary for Greg. The AI does not accept or reject anyone — Greg reads everything and makes every decision.
                </span>
              </label>
              <FieldError message={errors.consentAiInterview?.message} />
            </div>

            <div ref={containerRef} />
            {submitError && <p className="text-warning-red">{submitError}</p>}
          </fieldset>
        )}

        <div className="flex justify-between gap-4 pt-4">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => goTo(step - 1)} disabled={status !== "idle"}>
              Back
            </Button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Next</Button>
          ) : (
            <Button type="submit" disabled={status !== "idle" || passages.length === 0}>
              {status === "submitting" ? "Sending…" : status === "uploading" ? "Uploading CV…" : "Submit and start interview"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
