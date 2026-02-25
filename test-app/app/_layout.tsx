import { Stack } from "expo-router";
import { SessionCaptureProvider } from "expo-session-capture";

export default function RootLayout() {
  return (
    <SessionCaptureProvider
      userId="test-user-1"
      uploadUrl="http://localhost:3001/session-upload"
      samplingRate={1.0} // 100% under test
      maxFrames={30}
    >
      <Stack />
    </SessionCaptureProvider>
  );
}
