import * as React from 'react';

import { cn } from '@/lib/utils';

function ScrollArea({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('relative overflow-auto', className)} {...props} />;
}

export { ScrollArea };
