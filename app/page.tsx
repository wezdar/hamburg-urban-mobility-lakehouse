import type { Metadata } from "next";
import snapshot from "./data/dashboard.json";
import { MobilityDashboard } from "./components/MobilityDashboard";
import type { DashboardData } from "./lib/types";

export const metadata: Metadata = {
  title: "ElbeFlow — Hamburg Urban Mobility Lakehouse",
  description:
    "84,000+ official mobility streams across bikes, roads, charging and traffic control.",
};

export default function Home() {
  return <MobilityDashboard initialData={snapshot as DashboardData} />;
}
