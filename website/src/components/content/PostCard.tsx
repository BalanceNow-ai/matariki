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
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={post.heroImage}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-4 left-4">
            <Badge variant={post.category}>{post.category}</Badge>
          </div>
        </div>
        <div className="p-6">
          <div className="text-caption text-mist mb-3">
            {post.location.name} — {formatDate(post.publishedAt)}
          </div>
          <h3 className="font-display text-xl text-salt-white mb-3 line-clamp-2">
            {post.title}
          </h3>
          <p className="text-sm text-mist line-clamp-3">{post.excerpt}</p>
        </div>
      </Card>
    </Link>
  );
}
