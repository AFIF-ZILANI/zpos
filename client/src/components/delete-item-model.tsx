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
import { Trash2 } from "lucide-react";

export function DeleteItemModal({
  handleDelete,
  isPending,
  id,
}: {
  isPending: boolean;
  handleDelete: (id: string) => void;
  id: string;
}) {
  // const [open, setOpen] = useState(false);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex justify-center gap-1">
          <Button size="sm" variant="ghost">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => handleDelete(id)}
            disabled={isPending}
          >
            {isPending ? (
              <div className="flex items-center gap-2">
                <Spinner />
                <span>Deleting...</span>
              </div>
            ) : (
              <span>Delete</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
