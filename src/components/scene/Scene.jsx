import PropTypes from "prop-types";

import Preview from "../preview/Preview";
import FileTest from "../fileTest/FileTest";
import BackButton from "../ui/backbutton";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function Scene({ scene, setScene }) {
  function handleBack() {
    setScene("");
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <BackButton pagename={scene} handleBack={handleBack}></BackButton>

      <Accordion
        type="single"
        collapsible
        className="w-full"
        defaultValue="focus"
      >
        <AccordionItem value="focus">
          <AccordionTrigger>Focus and Target</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 text-balance">
            <Preview></Preview>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Exposure</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 text-balance">
            <FileTest></FileTest>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Return Policy</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 text-balance">
            <p>
              We stand behind our products with a comprehensive 30-day return
              policy. If you&apos;re not completely satisfied, simply return the
              item in its original condition.
            </p>
            <p>
              Our hassle-free return process includes free return shipping and
              full refunds processed within 48 hours of receiving the returned
              item.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

Scene.propTypes = {
  scene: PropTypes.string.isRequired,
  setScene: PropTypes.func.isRequired,
};

export default Scene;
