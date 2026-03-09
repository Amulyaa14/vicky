import { FileText, Video, Image, Zap, Wand2, Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
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
        <div className="pb-20 overflow-x-hidden">
            <Helmet>
                <title>QuickTools – Convert, Edit & Create Online for Free</title>
                <meta name="description" content="QuickTools is your all-in-one platform for document conversion, video editing, AI writing, image editing, and background removal. Free, fast, and secure." />
            </Helmet>
            {/* Hero Section */}
            <section className="relative py-16 sm:py-24 px-4 text-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-transparent pointer-events-none" />

                {/* Glow Effects - scaled for mobile */}
                <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[300px] sm:w-[600px] lg:w-[800px] h-[300px] sm:h-[600px] lg:h-[800px] bg-primary/10 blur-[80px] sm:blur-[120px] rounded-full pointer-events-none animate-pulse" />

                <div className="container relative z-10 max-w-4xl mx-auto flex flex-col items-center px-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium mb-6 sm:mb-8">
                        <Zap size={14} className="fill-current shrink-0" />
                        <span>New: AI-Powered Document Analysis</span>
                    </div>

                    {/* Mobile-first heading sizes */}
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 sm:mb-8 pb-2">
                        <span className="text-foreground block">One Platform.</span>
                        <span className="text-gradient block mt-2">Infinite Possibilities.</span>
                    </h1>

                    <p className="text-base sm:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-2">
                        The ultimate collection of free online tools. Convert documents, edit videos, and enhance content with AI — all in one place.
                    </p>

                    {/* Buttons stacked on mobile, row on sm+ */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-sm sm:max-w-none">
                        <Link to="/converter" className="w-full sm:w-auto">
                            <Button size="lg" className="w-full sm:w-auto rounded-full h-12 px-8 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
                                Start Converting <ArrowRight size={18} className="ml-2" />
                            </Button>
                        </Link>
                        <Link to="/ai-tools" className="w-full sm:w-auto">
                            <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-full h-12 px-8 bg-background/50 backdrop-blur-sm">
                                Explore AI Tools
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Ad Space */}
            <div className="container max-w-4xl mx-auto mb-16 sm:mb-20 px-4">
                <AdSpace className="border-primary/20 bg-primary/5" />
            </div>

            {/* Features Grid — 1 col on mobile, 2 on md, 4 on lg */}
            <section className="container px-4 mb-20 sm:mb-32">
                <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 text-foreground">Everything you need</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {features.map((feature) => (
                        <Link key={feature.title} to={feature.path} className="group">
                            <Card className="h-full hover:shadow-lg hover:border-primary/50 transition-all duration-300 group-hover:-translate-y-1">
                                <CardHeader>
                                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl ${feature.bg} ${feature.color} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform`}>
                                        <feature.icon size={22} />
                                    </div>
                                    <CardTitle className="text-lg sm:text-xl">{feature.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-sm sm:text-base">
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
                <Card className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 relative overflow-hidden border-none bg-secondary/30">
                    <div className="absolute top-0 right-0 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-primary/10 blur-[60px] sm:blur-[100px] rounded-full pointer-events-none" />

                    {/* Stacked on mobile, side-by-side on md+ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center relative z-10">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-foreground">Why Choose QuickTools?</h2>
                            <div className="space-y-6 sm:space-y-8">
                                <div className="flex gap-3 sm:gap-4">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                                        <Shield size={22} />
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-semibold mb-1 text-foreground">Secure & Private</h3>
                                        <p className="text-sm sm:text-base text-muted-foreground">Your files are encrypted and automatically deleted after 2 hours. We never read your content.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 sm:gap-4">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                        <Zap size={22} />
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-semibold mb-1 text-foreground">Lightning Fast</h3>
                                        <p className="text-sm sm:text-base text-muted-foreground">Powered by advanced cloud servers for instant processing. No queues, no waiting.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="h-48 sm:h-full min-h-[200px] sm:min-h-[280px] flex items-center justify-center bg-background/50 rounded-2xl border border-dashed border-muted-foreground/25">
                            <span className="text-muted-foreground font-medium text-sm text-center px-4">Illustration / Dashboard Preview</span>
                        </div>
                    </div>
                </Card>
            </section>
        </div>
    );
};

export default Home;
