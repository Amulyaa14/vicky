import { FileText, Video, Image, Zap, Wand2, Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdSpace from '@/components/ui/AdSpace';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';

const features = [
    {
        icon: FileText,
        title: 'Document Converter',
        description: 'Convert PDF to Word, Excel, PPT and more with perfect formatting.',
        path: '/converter',
        color: 'text-blue-500',
        bg: 'bg-blue-500/10'
    },
    {
        icon: Video,
        title: 'Video Studio',
        description: 'Edit, trim, and enhance your videos with a full timeline directly in the browser.',
        path: '/video-studio',
        color: 'text-pink-500',
        bg: 'bg-pink-500/10'
    },
    {
        icon: Wand2,
        title: 'AI Tools',
        description: 'Rewrite, summarize, and fix grammar with advanced AI.',
        path: '/ai-tools',
        color: 'text-purple-500',
        bg: 'bg-purple-500/10'
    },
    {
        icon: Image,
        title: 'Background Remover',
        description: 'Remove backgrounds from images instantly with high precision.',
        path: '/bg-remover',
        color: 'text-green-500',
        bg: 'bg-green-500/10'
    },
];

const Home = () => {
    return (
        <div className="pb-20">
            {/* Hero Section */}
            <section className="relative py-24 px-4 text-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-transparent pointer-events-none" />

                {/* Glow Effects */}
                <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 blur-[120px] rounded-full pointer-events-none animate-pulse" />

                <div className="container relative z-10 max-w-4xl mx-auto flex flex-col items-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8 animate-fade-in">
                        <Zap size={14} className="fill-current" />
                        <span>New: AI-Powered Document Analysis</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 pb-2 animate-slide-up">
                        <span className="text-foreground block">One Platform.</span>
                        <span className="text-gradient block mt-2">Infinite Possibilities.</span>
                    </h1>

                    <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        The ultimate collection of free online tools. Convert documents, edit videos, and enhance content with AI — all in one place.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <Link to="/converter">
                            <Button size="lg" className="rounded-full h-12 px-8 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
                                Start Converting <ArrowRight size={18} className="ml-2" />
                            </Button>
                        </Link>
                        <Link to="/ai-tools">
                            <Button variant="outline" size="lg" className="rounded-full h-12 px-8 bg-background/50 backdrop-blur-sm">
                                Explore AI Tools
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Ad Space */}
            <div className="container max-w-4xl mx-auto mb-20 px-4">
                <AdSpace className="border-primary/20 bg-primary/5" />
            </div>

            {/* Features Grid */}
            <section className="container px-4 mb-32">
                <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Everything you need</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature) => (
                        <Link key={feature.title} to={feature.path} className="group">
                            <Card className="h-full hover:shadow-lg hover:border-primary/50 transition-all duration-300 group-hover:-translate-y-1">
                                <CardHeader>
                                    <div className={`w-12 h-12 rounded-xl ${feature.bg} ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        <feature.icon size={24} />
                                    </div>
                                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-base">
                                        {feature.description}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Why Choose Us */}
            <section className="container px-4">
                <Card className="rounded-3xl p-8 md:p-12 relative overflow-hidden border-none bg-secondary/30">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

                    <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
                        <div>
                            <h2 className="text-3xl font-bold mb-8 text-foreground">Why Choose QuickTools?</h2>
                            <div className="space-y-8">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                                        <Shield size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-1 text-foreground">Secure & Private</h3>
                                        <p className="text-muted-foreground">Your files are encrypted and automatically deleted after 2 hours. We never read your content.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                        <Zap size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-1 text-foreground">Lightning Fast</h3>
                                        <p className="text-muted-foreground">Powered by advanced cloud servers for instant processing. No queues, no waiting.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="h-full min-h-[300px] flex items-center justify-center bg-background/50 rounded-2xl border border-dashed border-muted-foreground/25">
                            <span className="text-muted-foreground font-medium">Illustration / Dashboard Preview</span>
                        </div>
                    </div>
                </Card>
            </section>
        </div>
    );
};

export default Home;
