import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import type { LogEntry } from "@/types";

interface PostCardProps {
  post: LogEntry;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Link href={`/log/${post.slug}`}>
      <Card className="h-full">
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-water/50">
          {post.heroImage ? (
            <Image
              src={post.heroImage}
              alt={post.title}
              fill
              className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-mist">
              <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="absolute top-4 left-4">
            <Badge variant={post.category}>{post.category}</Badge>
          </div>
        </div>
        <div className="p-6">
          <div className="text-caption text-mist mb-3">
            {post.location?.name ? `${post.location.name} — ` : ""}{formatDate(post.publishedAt)}
          </div>
          <h3 className="font-display text-xl text-salt-white mb-3 line-clamp-2">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="text-sm text-mist line-clamp-3">{post.excerpt}</p>
          )}
        </div>
      </Card>
    </Link>
  );
}
