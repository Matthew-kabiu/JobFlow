import { useEffect, useState } from "react";

export function useWideLayout() {
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 1200px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1200px)");
    const update = () => setWide(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return wide;
}
