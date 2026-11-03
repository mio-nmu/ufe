"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { uploadAdminImage } from "@/lib/admin/media-upload";
import { revalidatePublicTag } from "@/lib/admin/revalidate";
import { ApiClientError, api } from "@/lib/api-client";

interface BrandData {
  logo: string;
  logoDark: string;
  siteName: string;
}

interface ContactData {
  address: string;
  email: string;
  facebook: string;
  instagram: string;
  phones: string[];
  web: string;
}

type GeneralSections = {
  sections: Partial<Record<"brand" | "contact", Record<string, unknown>>>;
};

const DEFAULT_BRAND: BrandData = { logo: "", logoDark: "", siteName: "СЭЗИС" };
const DEFAULT_CONTACT: ContactData = {
  address: "",
  email: "",
  facebook: "",
  instagram: "",
  phones: [],
  web: "",
};

/**
 * Ерөнхий мэдээлэл — logo + site name (header & footer) and social links
 * (footer), stored as the `general` page's site-content sections (brand /
 * contact). Address, phones and email are edited in «Холбоо барих». The form remounts (keyed by the
 * fetched data) so server values seed it without effects.
 */
export function GeneralManager() {
  const siteQuery = useQuery({
    queryKey: ["site-content", "general"],
    queryFn: () =>
      api.get<GeneralSections>("/api/v1/content/site-content/general"),
  });

  if (siteQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const error =
    siteQuery.error instanceof ApiClientError ? siteQuery.error.message : null;

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <GeneralForm
        key={siteQuery.dataUpdatedAt}
        initialBrand={{
          ...DEFAULT_BRAND,
          ...(siteQuery.data?.sections.brand as Partial<BrandData>),
        }}
        initialContact={{
          ...DEFAULT_CONTACT,
          ...(siteQuery.data?.sections.contact as Partial<ContactData>),
        }}
      />
    </div>
  );
}

function GeneralForm({
  initialBrand,
  initialContact,
}: {
  initialBrand: BrandData;
  initialContact: ContactData;
}) {
  const [brand, setBrand] = useState(initialBrand);
  const [contact, setContact] = useState(initialContact);
  const [saving, setSaving] = useState<"brand" | "contact" | null>(null);
  const [uploading, setUploading] = useState(false);

  const saveSection = async (
    section: "brand" | "contact",
    data: Record<string, unknown>,
  ) => {
    setSaving(section);
    try {
      await api.put(`/api/v1/content/site-content/general/${section}`, {
        data,
      });
      toast.success("Хадгалагдлаа");
      // Header logo / name and footer links are ISR-cached: purge now.
      void revalidatePublicTag("site-content");
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Хадгалахад алдаа гарлаа",
      );
    } finally {
      setSaving(null);
    }
  };

  const uploadLogo = async (file: File, key: "logo" | "logoDark") => {
    setUploading(true);
    try {
      const url = await uploadAdminImage(file, "logo");
      setBrand((prev) => ({ ...prev, [key]: url }));
      toast.success("Лого хуулагдлаа — Хадгалах товч дарна уу");
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : "Лого хуулахад алдаа гарлаа",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {/* Брэнд / лого */}
      <section className="space-y-4 rounded-md border p-5">
        <h3 className="font-semibold">Брэнд ба лого</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="brand-sitename">Сайтын нэр</Label>
            <Input
              id="brand-sitename"
              value={brand.siteName}
              onChange={(event) =>
                setBrand((p) => ({ ...p, siteName: event.target.value }))
              }
            />
          </div>
          {(["logo", "logoDark"] as const).map((key) => (
            <div key={key} className="grid gap-1.5">
              <Label htmlFor={`brand-${key}`}>
                {key === "logo"
                  ? "Лого (цагаан дэвсгэрт)"
                  : "Лого (бороо дэвсгэрт)"}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`brand-${key}`}
                  value={brand[key]}
                  placeholder="https://…"
                  onChange={(event) =>
                    setBrand((p) => ({ ...p, [key]: event.target.value }))
                  }
                />
                <Label
                  htmlFor={`brand-${key}-file`}
                  className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-xs font-medium"
                >
                  {uploading ? (
                    <Loader2
                      className="size-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Upload className="size-3.5" aria-hidden="true" />
                  )}
                  Хуулах
                  <input
                    id={`brand-${key}-file`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadLogo(file, key);
                      event.target.value = "";
                    }}
                  />
                </Label>
              </div>
              {brand[key] ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary-origin logo URL
                <img
                  src={brand[key]}
                  alt="Лого урьдчилан харах"
                  className="max-h-16 w-fit rounded border"
                />
              ) : null}
            </div>
          ))}
        </div>
        <Button
          onClick={() => void saveSection("brand", { ...brand })}
          disabled={saving === "brand"}
        >
          {saving === "brand" ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : null}
          Брэнд хадгалах
        </Button>
      </section>

      {/* Сошиал хаяг — address / phones / email live in «Холбоо барих». */}
      <section className="space-y-4 rounded-md border p-5">
        <div>
          <h3 className="font-semibold">Сошиал хаяг</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Сайтын хөлд харагдана. Хаяг, утас, имэйлийг{" "}
            <Link
              href="/admin/text/contact"
              className="text-foreground underline underline-offset-4"
            >
              Хуудасны текст → Холбоо барих
            </Link>{" "}
            хэсгээс засна.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="contact-facebook">Facebook</Label>
            <Input
              id="contact-facebook"
              value={contact.facebook}
              placeholder="https://facebook.com/…"
              onChange={(event) =>
                setContact((p) => ({ ...p, facebook: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="contact-instagram">Instagram</Label>
            <Input
              id="contact-instagram"
              value={contact.instagram}
              placeholder="https://instagram.com/…"
              onChange={(event) =>
                setContact((p) => ({ ...p, instagram: event.target.value }))
              }
            />
          </div>
        </div>
        <Button
          onClick={() => void saveSection("contact", { ...contact })}
          disabled={saving === "contact"}
        >
          {saving === "contact" ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : null}
          Холбоо барих хадгалах
        </Button>
      </section>
    </>
  );
}
