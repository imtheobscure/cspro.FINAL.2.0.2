import { useEffect, useState } from "react";
import Classroom from "./classroom/Classroom";
import TutorControl from "./tutor/TutorControl";

function getRoute(): "classroom" | "tutor" {
  if (typeof window === "undefined") return "classroom";
  return window.location.hash.includes("tutor-control") ? "tutor" : "classroom";
}

export default function App() {
  const [route, setRoute] = useState<"classroom" | "tutor">(getRoute());

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (route === "tutor") return <TutorControl />;
  return <Classroom />;
}
