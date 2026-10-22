"use client";

import type { OwnerVehicle } from "@car-rental/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type FieldPath } from "react-hook-form";
import { categoryLabels, fuelLabels, toOptions, transmissionLabels } from "@/domains/vehicles/format";
import { ApiError, errorMessage, isApiError } from "@/shared/api/api-error";
import { Button } from "@/shared/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Field } from "@/shared/components/ui/field";
import { FormAlert } from "@/shared/components/ui/form-alert";
import { Input, Textarea } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { useToast } from "@/shared/components/ui/toast";
import { useSaveVehicle } from "../hooks";
import {
  FEATURE_OPTIONS,
  SERVER_FIELD_MAP,
  TIMEZONES,
  toFormValues,
  toVehicleInput,
  vehicleFormSchema,
  type VehicleFormOutput,
  type VehicleFormValues,
} from "../vehicle-form-schema";

/** Add / edit vehicle (38_Add listing), with rental terms instead of a sale price. */
export function VehicleForm({ vehicle }: { vehicle?: OwnerVehicle }) {
  const router = useRouter();
  const toast = useToast();
  const save = useSaveVehicle(vehicle?.id);
  const form = useForm<VehicleFormValues, unknown, VehicleFormOutput>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: toFormValues(vehicle),
  });
  const { errors, isSubmitting } = form.formState;

  const submit = (status: "DRAFT" | "ACTIVE") =>
    form.handleSubmit(async (values) => {
      try {
        const body = toVehicleInput(values);
        await save.mutateAsync(vehicle ? { ...body, version: vehicle.version } : { ...body, status });
        toast.success(vehicle ? "Changes saved" : status === "ACTIVE" ? "Vehicle listed" : "Draft saved");
        router.push("/dashboard/fleet");
      } catch (error) {
        if (error instanceof ApiError) {
          for (const [field, message] of Object.entries(error.fieldErrors)) {
            form.setError((SERVER_FIELD_MAP[field] ?? field) as FieldPath<VehicleFormValues>, { message });
          }
        }
        form.setError("root", {
          message: isApiError(error, 409) ? "This vehicle was changed elsewhere. Reload the page to get the latest version." : errorMessage(error),
        });
      }
    });

  const text = (name: FieldPath<VehicleFormValues>, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <Field label={label} htmlFor={name} error={errors[name as keyof typeof errors]?.message as string | undefined}>
      <Input id={name} aria-invalid={!!errors[name as keyof typeof errors]} aria-describedby={`${name}-message`} {...props} {...form.register(name)} />
    </Field>
  );
  const choice = (name: "category" | "transmission" | "fuelType" | "timezone", label: string, options: { value: string; label: string }[]) => (
    <Field label={label} htmlFor={name}>
      <Controller control={form.control} name={name} render={({ field }) => <Select id={name} value={field.value} onValueChange={field.onChange} options={options} />} />
    </Field>
  );

  return (
    <form onSubmit={submit("ACTIVE")} noValidate className="flex flex-col gap-6">
      {errors.root && <FormAlert>{errors.root.message}</FormAlert>}

      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
        </CardHeader>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-strong px-6 py-10 text-center">
          <ImagePlus aria-hidden className="size-8 text-icon" />
          <p className="font-heading font-medium text-heading">Photo uploads are coming soon</p>
          <p className="text-xs">Your listing shows a placeholder until photos can be added.</p>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Car details</CardTitle>
        </CardHeader>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {text("make", "Make *", { placeholder: "e.g. Toyota" })}
          {text("model", "Model *", { placeholder: "e.g. Corolla" })}
          {text("year", "Year *", { inputMode: "numeric" })}
          {choice("category", "Body type *", toOptions(categoryLabels))}
          {text("seats", "Seats *", { inputMode: "numeric" })}
          {text("doors", "Doors *", { inputMode: "numeric" })}
          {choice("transmission", "Transmission *", toOptions(transmissionLabels))}
          {choice("fuelType", "Fuel type *", toOptions(fuelLabels))}
          {text("color", "Color", { placeholder: "e.g. Silver" })}
          <Field label="Description" htmlFor="description" className="sm:col-span-2 xl:col-span-4" error={errors.description?.message}>
            <Textarea id="description" placeholder="What makes this car great for a trip?" {...form.register("description")} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <Controller
          control={form.control}
          name="features"
          render={({ field }) => (
            <fieldset className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <legend className="sr-only">Features</legend>
              {FEATURE_OPTIONS.map((feature) => (
                <label key={feature} className="flex items-center gap-2 text-heading">
                  <Checkbox
                    checked={field.value.includes(feature)}
                    onCheckedChange={(checked) => field.onChange(checked ? [...field.value, feature] : field.value.filter((f) => f !== feature))}
                  />
                  {feature}
                </label>
              ))}
            </fieldset>
          )}
        />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Price & rental terms</CardTitle>
        </CardHeader>
        <div className="grid gap-5 sm:grid-cols-3">
          {text("dailyRate", "Daily rate (USD) *", { inputMode: "decimal", placeholder: "Your price" })}
          {text("minDays", "Minimum days *", { inputMode: "numeric" })}
          {text("maxDays", "Maximum days *", { inputMode: "numeric" })}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <div className="grid gap-5 sm:grid-cols-3">
          {text("city", "City *", { placeholder: "e.g. Lisbon" })}
          {text("address", "Pick-up address", { placeholder: "Shared with renters after booking" })}
          {choice("timezone", "Timezone *", TIMEZONES.map((tz) => ({ value: tz, label: tz })))}
        </div>
      </Card>

      <div className="flex flex-wrap justify-center gap-3">
        {vehicle ? (
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save changes"}</Button>
        ) : (
          <>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "List now"}</Button>
            <Button type="button" variant="outline-primary" disabled={isSubmitting} onClick={submit("DRAFT")}>
              Save draft
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
