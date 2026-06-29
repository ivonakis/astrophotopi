import PropTypes from "prop-types";

import Preview from "../preview/Preview";
import Exposure from "../exposure/Exposure";
import Flats from "../flats/Flats";
import Video from "../video/Video";
import Automation from "../automation/Automation";
import BackButton from "../ui/backbutton";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

function Scene({ scene, setScene }) {
  function handleBack() {
    setScene("");
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <BackButton pagename={scene} handleBack={handleBack}></BackButton>

      <Tabs defaultValue="focus">
        <TabsList>
          <TabsTrigger value="focus">Focus and Target</TabsTrigger>
          <TabsTrigger value="exposure">Exposure</TabsTrigger>
          <TabsTrigger value="flats">Flats</TabsTrigger>
          <TabsTrigger value="video">Video</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>
        <TabsContent value="focus" className="flex flex-col gap-4">
          <Preview></Preview>
        </TabsContent>
        <TabsContent value="exposure" className="flex flex-col gap-4">
          <Exposure></Exposure>
        </TabsContent>
        <TabsContent value="flats" className="flex flex-col gap-4">
          <Flats></Flats>
        </TabsContent>
        <TabsContent value="video" className="flex flex-col gap-4">
          <Video></Video>
        </TabsContent>
        <TabsContent value="automation" className="flex flex-col gap-4">
          <Automation scene={scene}></Automation>
        </TabsContent>
      </Tabs>
    </div>
  );
}

Scene.propTypes = {
  scene: PropTypes.string.isRequired,
  setScene: PropTypes.func.isRequired,
};

export default Scene;
