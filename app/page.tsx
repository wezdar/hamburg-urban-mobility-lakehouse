import type { Metadata } from "next";
import snapshot from "./data/dashboard.json";
import { MobilityDashboard } from "./components/MobilityDashboard";
import type { DashboardData } from "./lib/types";

export const metadata: Metadata = {
  title: "ElbeFlow — Hamburg Urban Mobility Lakehouse",
  description:
    "A live, production-minded data platform for Hamburg's public mobility network.",
};

export default function Home() {
  return <MobilityDashboard initialData={snapshot as DashboardData} />;
}
