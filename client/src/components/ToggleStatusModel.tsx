import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Power, PowerOff } from "lucide-react";

export function ToggleStatusModal({
  handleToggleStatus,
  isPending,
  isActive,
  id,
  name,
}: {
  isPending: boolean;
  isActive: boolean;
  handleToggleStatus: (id: string) => void;
  id: string;
  name: string;
}) {
  // const [open, setOpen] = useState(false);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex justify-center gap-1">
          <Button size="sm" variant="ghost">
            {isActive ? (
              <Power className="w-4 h-4" />
            ) : (
              <PowerOff className="w-4 h-4" />
            )}
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Are you sure you want to {isActive ? "deactivate" : "activate"}{" "}
            <span className={isActive ? "text-destructive" : "text-green-600"}>
              {name}
            </span>
            ?
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p>
              {isActive
                ? `If you deactivate ${name}, they will no longer be able to place orders.`
                : `If you activate ${name}, they will be able to place orders again.`}
            </p>
            {isActive ? (
              <p className="flex items-center gap-1">
                <PowerOff className="w-4 h-4 text-destructive" />
                <span>Deactivate</span>
              </p>
            ) : (
              <p className="flex items-center gap-1">
                <Power className="w-4 h-4 text-green-600" />
                <span>Activate</span>
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant={isActive ? "destructive" : "default"}
            onClick={() => handleToggleStatus(id)}
            disabled={isPending}
          >
            {isPending ? (
              <div className="flex items-center gap-2">
                <Spinner />
                <span>{isActive ? "Deactivating..." : "Activating..."}</span>
              </div>
            ) : (
              <span>{isActive ? "Deactivate" : "Activate"}</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
