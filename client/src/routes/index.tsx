import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <div className="flex h-dvh justify-center items-center">
      {/*ON HOVER AUTOPLAY IMAGES like netflix*/}

      <Link to="/" className="rounded w-2xs shadow-sm">
        <div className="relative overflow-hidden">
          <img
            className="rounded-t aspect-video object-cover object-center"
            alt="test"
            src="https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=700&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
          />
          <div className="absolute top-0 left-0"></div>
        </div>

        {/*  */}
        <div className="m-2">
          <h1 className="font-semibold line-clamp-2 line leading-tight">House in London</h1>
          <h3 className="text-xs text-gray-900/80">$2,000 monthly·5</h3>
        </div>
      </Link>
    </div>
  );
}
