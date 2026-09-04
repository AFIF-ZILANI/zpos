import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { User, Phone, Mail, MapPin } from "lucide-react";
import {
  updateCustomerSchema,
  type UpdateCustomer,
} from "@myapp/shared/schemas/customer.schema";
import { toast } from "sonner";

interface Props {
  customer?: UpdateCustomer | null;
  handleUpdateCustomer: (data: UpdateCustomer) => void;
  isUpdating: boolean;
  open: boolean;
  onClose: () => void;
}
interface Prop {
  customer: UpdateCustomer;
  handleUpdateCustomer: (data: UpdateCustomer) => void;
  isUpdating: boolean;
  open: boolean;
  onClose: () => void;
}

export function EditCustomerModal({
  customer,
  handleUpdateCustomer,
  isUpdating,
  open,
  onClose,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      {customer && (
        <EditCustomerForm
          customer={customer}
          handleUpdateCustomer={handleUpdateCustomer}
          isUpdating={isUpdating}
          open={open}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

function EditCustomerForm({
  customer,
  handleUpdateCustomer,
  isUpdating,
  open,
  onClose,
}: Prop) {
  const form = useForm<UpdateCustomer>({
    resolver: zodResolver(updateCustomerSchema),
    defaultValues: {
      id: "",
      name: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  // Re-populate form whenever the customer prop changes or modal reopens
  useEffect(() => {
    if (open) {
      form.reset({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email ?? "",
        address: customer.address ?? "",
      });
    }
  }, [open, customer, form]);

  function onError(error: unknown) {
    console.error(error);
    toast.error("Failed to update customer");
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Edit Customer</DialogTitle>
        <DialogDescription>
          Update the details for{" "}
          <span className="font-medium text-foreground">{customer.name}</span>.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleUpdateCustomer, onError)}
          className="space-y-4"
        >
          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Name
                </FormLabel>
                <FormControl>
                  <Input placeholder="Customer name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Phone */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  Phone
                </FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="01XXXXXXXXX" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Email{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (optional)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Address */}
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Address{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (optional)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Delivery / billing address"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isUpdating}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              className="flex-1"
              disabled={isUpdating || !form.formState.isDirty}
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}
