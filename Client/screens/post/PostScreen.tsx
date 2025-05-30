import React, { useRef, useState, useEffect } from "react";
import { Text, TouchableOpacity, Image } from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { Box } from "@/components/ui/box";
import { LinearGradient } from "@/components/ui/linear-gradient";
import { IC_Camera_Flip, IC_Flash, IC_NoFlash, IC_Vi } from "@/utils/constants/Icons";
import { Props } from "@/types/NavigationTypes";
import { uploadMedia } from "@/utils/api/external/CloudinaryAPI";

interface PostScreenProps extends Props {}

export default function PostScreen({ navigation }: PostScreenProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraDirection, setCameraDirection] = useState<CameraType>("back");
    const [isFlashOn, setIsFlashOn] = useState(false);
    const cameraRef = useRef<any>(null);

    useEffect(() => {
        if (!permission?.granted) {
        requestPermission();
        }
    }, [permission]);

    const takePhoto = async () => {
        if (cameraRef.current) {
        try {
            const photo = await cameraRef.current.takePictureAsync();
            onPhotoTaken(photo.uri);
        } catch (error) {
            console.error("Failed to take photo:", error);
        }
        }
    };

    const onPhotoTaken = async (photoUri: string) => {
        console.log("photoUri", photoUri);
        // const mediaUrl = await uploadMedia(photoUri, "post");
        // console.log("mediaUrl", mediaUrl);
    }

    if (!permission) {
        return (
        <Box className="flex-1 items-center justify-center bg-white">
            <Text>Requesting camera permission...</Text>
        </Box>
        );
    }

    if (!permission.granted) {
        return (
        <Box className="flex-1 items-center justify-center bg-white">
            <Text>No camera access.</Text>
            <TouchableOpacity onPress={requestPermission} className="mt-4 px-4 py-2 bg-blue-500 rounded-lg">
            <Text className="text-white">Grant Permission</Text>
            </TouchableOpacity>
        </Box>
        );
    }

    return (
    <Box className="flex-1">
        {/* Camera View */}
        <Box className="flex-1">
            <CameraView
            ref={cameraRef}
            style={{ width: "100%", height: "100%" }}
            facing={cameraDirection}
            flash={isFlashOn ? "on" : "off"}
            />
            <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'transparent']}
            start={[0.5, 1]}
            end={[0.5, 0]}
            className="absolute inset-0"
            />
        </Box>

        {/* Bottom Controls */}
        <Box className="absolute bottom-[10%] left-0 right-0 px-8 flex-row justify-around items-center">
            {/* Flash */}
            <TouchableOpacity
            onPress={() => setIsFlashOn(prev => !prev)}
            className="w-14 h-14 bg-white rounded-full items-center justify-center"
            >
            {isFlashOn ? <IC_NoFlash className="w-8 h-8" /> : <IC_Flash className="w-8 h-8" />}
            </TouchableOpacity>

            {/* Capture */}
            <TouchableOpacity
            onPress={takePhoto}
            className="w-21 h-21 bg-purple-400 rounded-full items-center justify-center"
            >
            <Box className="w-20 h-20 justify-center items-center bg-purple-600 border-4 rounded-full border-black">
                <IC_Vi color="white" className="w-10 h-10" />
            </Box>
            </TouchableOpacity>

            {/* Flip */}
            <TouchableOpacity
            onPress={() => setCameraDirection(prev => (prev === "front" ? "back" : "front"))}
            className="w-14 h-14 bg-white rounded-full items-center justify-center"
            >
            <IC_Camera_Flip className="w-8 h-8" />
            </TouchableOpacity>
        </Box>
    </Box>
    );
}
