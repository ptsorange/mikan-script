import { listProjects } from "@/lib/projects";
import SiteHeader from "@/app/_components/SiteHeader";
import SiteFooter from "@/app/_components/SiteFooter";
import HomeView from "@/app/_components/HomeView";

export default async function Home() {
  const projects = await listProjects();

  return (
    <div className="ms-app">
      <SiteHeader />
      <HomeView projects={projects} />
      <SiteFooter />
    </div>
  );
}
