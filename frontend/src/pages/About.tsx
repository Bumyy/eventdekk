import { Button } from "@/components/ui/button";

const About = () => {
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <h1 className="text-4xl font-bold tracking-tight mb-4">About Us</h1>
        <p className="text-muted-foreground mb-8">This is currently not used</p>
        <Button variant="outline">Learn More</Button>
      </div>
    </div>
  );
};

export default About;
