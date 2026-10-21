import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useGetAmenitiesQuery } from "@/features/core/api/amenitiesApi";
import {
  PROPERTY_FIELDS,
  PROPERTY_SECTIONS,
  fieldKeysFor,
  type FieldSpec,
  type PropertyFieldKey,
  type PropertyFormMode,
  type PropertyFormValues,
} from "@/features/pm/propertyForm";
import PropertyTermsFields from "@/features/pm/components/PropertyTermsFields";

const UNSET = "__unset";

interface PropertyFormFieldsProps {
  form: UseFormReturn<PropertyFormValues>;
  mode: PropertyFormMode;
  /** An agent sees the agent or company number as the owner contact, never the owner's. It is not editable. */
  hideOwnerContact: boolean;
}

const spansTwo = (spec: FieldSpec) =>
  spec.kind === "textarea" || spec.kind === "list" || spec.kind === "json" || spec.kind === "amenities";

function AmenityChecklist({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const amenities = useGetAmenitiesQuery();
  const selected = new Set(value ? value.split(",").map(Number) : []);
  const toggle = (id: number, checked: boolean) => {
    if (checked) selected.add(id);
    else selected.delete(id);
    onChange([...selected].join(","));
  };
  if (amenities.isLoading) return <div role="status" className="text-sm text-muted-foreground">Loading amenities…</div>;
  if (amenities.isError) return <div role="alert" className="text-sm text-destructive">Could not load amenities.</div>;
  if (!amenities.data?.length) return <div className="text-sm text-muted-foreground">No amenities</div>;
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
      {amenities.data.map((a) => (
        <label key={a.id} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={selected.has(a.id)} onChange={(e) => toggle(a.id, e.target.checked)} />
          <span>{a.title}</span>
        </label>
      ))}
    </div>
  );
}

function SelectControl({ spec, mode, value, onChange }: {
  spec: FieldSpec;
  mode: PropertyFormMode;
  value: string;
  onChange: (next: string) => void;
}) {
  const options = spec.kind === "boolean" ? ["true", "false"] : spec.options ?? [];
  // A blank nullable field is "not set" (edit sends null to clear it). A blank field that the backend cannot
  // clear is only left blank on create, where the backend then applies its default.
  const unsetLabel = spec.required ? null : !spec.notNull ? "Not set" : mode === "create" ? "Backend default" : null;
  return (
    <Select value={value || (unsetLabel ? UNSET : undefined)} onValueChange={(v) => onChange(v === UNSET ? "" : v)}>
      <FormControl>
        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
      </FormControl>
      <SelectContent>
        {unsetLabel ? <SelectItem value={UNSET}>{unsetLabel}</SelectItem> : null}
        {options.map((o) => (
          <SelectItem key={o} value={o}>{spec.kind === "boolean" ? (o === "true" ? "Yes" : "No") : o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FieldControl({ spec, mode, value, onChange, onBlur }: {
  spec: FieldSpec;
  mode: PropertyFormMode;
  value: string;
  onChange: (next: string) => void;
  onBlur: () => void;
}) {
  switch (spec.kind) {
    case "select":
    case "boolean":
      return <SelectControl spec={spec} mode={mode} value={value} onChange={onChange} />;
    case "amenities":
      return <AmenityChecklist value={value} onChange={onChange} />;
    case "textarea":
    case "list":
    case "json":
      return (
        <FormControl>
          <Textarea rows={spec.kind === "json" ? 5 : 3} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
        </FormControl>
      );
    case "int":
    case "decimal":
      return (
        <FormControl>
          <Input
            type="number"
            min={spec.min}
            max={spec.max}
            step={spec.kind === "int" ? 1 : "any"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
          />
        </FormControl>
      );
    case "date":
      return (
        <FormControl>
          <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
        </FormControl>
      );
    default:
      return (
        <FormControl>
          <Input value={value} maxLength={spec.max} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
        </FormControl>
      );
  }
}

/** Every declared listing field of a managed property, by section, plus the PM terms. */
export default function PropertyFormFields({ form, mode, hideOwnerContact }: PropertyFormFieldsProps) {
  const keys = fieldKeysFor(mode).filter((key) => !(hideOwnerContact && key === "owner_contact"));
  const byKey = (section: string) => keys.filter((key) => PROPERTY_FIELDS[key].section === section);

  return (
    <div className="space-y-6">
      <PropertyTermsFields form={form} />
      {PROPERTY_SECTIONS.map((section) => {
        const sectionKeys: PropertyFieldKey[] = byKey(section.id);
        if (!sectionKeys.length) return null;
        return (
          <fieldset key={section.id} className="grid gap-4 md:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold">{section.title}</legend>
            {sectionKeys.map((key) => {
              const spec = PROPERTY_FIELDS[key];
              return (
                <FormField
                  key={key}
                  control={form.control}
                  name={key}
                  render={({ field }) => (
                    <FormItem className={spansTwo(spec) ? "md:col-span-2" : undefined}>
                      <FormLabel>{spec.label}</FormLabel>
                      <FieldControl spec={spec} mode={mode} value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
                      {spec.hint ? <p className="text-xs text-muted-foreground">{spec.hint}</p> : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              );
            })}
          </fieldset>
        );
      })}
    </div>
  );
}
