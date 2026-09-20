import splashIcon from "../lib/splashIcon.js";
import { useEffect, useState } from "react";

export default function Splash() {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), 1050);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className={leaving ? "sc-splash sc-splash-out" : "sc-splash"}>
      <img className="sc-splash-icon" src={splashIcon} alt="" />
      <div className="sc-splash-eyebrow">INVENTORY</div>
      <div className="sc-splash-title">STOCK CHECK</div>
      <div className="sc-splash-bar"><span /></div>
    </div>
  );
}
