import { Button } from "../ui/button";
import { ArrowLeftIcon } from "lucide-react";

function BackButton({pagename, handleBack}) {
    return (
        <div className="flex gap-4">
        <Button
          variant="outline"
          // size="icon"
          onClick={handleBack}
        >
          <ArrowLeftIcon /> Back
        </Button>
        <h1 className="text-2xl">{pagename}</h1>
      </div>
    );
}

export default BackButton;