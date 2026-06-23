import PropTypes from "prop-types";

import Preview from "../preview/Preview";
import FileTest from "../fileTest/FileTest";
import Video from "../video/Video";
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
          <TabsTrigger value="video">Video</TabsTrigger>
        </TabsList>
        <TabsContent value="focus" className="flex flex-col gap-4">
          <Preview></Preview>
        </TabsContent>
        <TabsContent value="exposure" className="flex flex-col gap-4">
          <FileTest></FileTest>
        </TabsContent>
        <TabsContent value="video" className="flex flex-col gap-4">
          <Video></Video>
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
