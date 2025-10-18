import { Loader2 } from "lucide-react";

interface LoaderProps extends React.ComponentProps<typeof Loader2> {}

export default function Loader(props: LoaderProps) {
    return <Loader2 className="my-4 h-8 w-8 animate-spin mx-auto" {...props}/>;
}
