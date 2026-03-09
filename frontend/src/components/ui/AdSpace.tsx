import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

interface AdSpaceProps extends ComponentProps<'div'> {
    slotId?: string;
    format?: 'horizontal' | 'vertical' | 'rectangle';
}

const AdSpace = ({ slotId, format = 'horizontal', className, ...props }: AdSpaceProps) => {
    const dimensions = {
        horizontal: 'w-full h-[90px]',
        vertical: 'w-[160px] h-[600px]',
        rectangle: 'w-[300px] h-[250px]',
    };

    return (
        <div
            className={cn(
                "bg-muted/30 border border-border border-dashed rounded-lg flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest",
                dimensions[format],
                className
            )}
            {...props}
        >
            <div className="text-center">
                <span className="block mb-1">Advertisement</span>
                {slotId && <span className="text-[10px] opacity-50">Slot: {slotId}</span>}
            </div>
        </div>
    );
};

export default AdSpace;
