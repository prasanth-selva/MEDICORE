import { useState, useEffect } from 'react';

/** Skeleton shimmer block for loading states */
function Skeleton({ width, height, radius, className = '', style = {} }) {
    return (
        <div
            className={`skeleton ${className}`}
            style={{
                width: width || '100%',
                height: height || '20px',
                borderRadius: radius || 'var(--radius-sm)',
                ...style,
            }}
        />
    );
}

/** Card-shaped skeleton */
function SkeletonCard({ lines = 3 }) {
    return (
        <div className="card skeleton-card">
            <Skeleton width="40%" height="14px" style={{ marginBottom: 16 }} />
            <Skeleton width="60%" height="28px" style={{ marginBottom: 20 }} />
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={i} width={`${85 - i * 15}%`} height="12px" style={{ marginBottom: 10 }} />
            ))}
        </div>
    );
}

/** Stat card skeleton */
function SkeletonStat() {
    return (
        <div className="card skeleton-card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Skeleton width="100px" height="13px" />
                <Skeleton width="36px" height="36px" radius="var(--radius-md)" />
            </div>
            <Skeleton width="80px" height="32px" style={{ marginBottom: 8 }} />
            <Skeleton width="120px" height="11px" />
        </div>
    );
}

/** Table skeleton */
function SkeletonTable({ rows = 5, cols = 4 }) {
    return (
        <div className="card" style={{ overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', gap: 16, padding: '14px 20px', background: 'var(--bg-tertiary)' }}>
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} width={`${100 / cols}%`} height="12px" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} style={{ display: 'flex', gap: 16, padding: '14px 20px', borderBottom: '1px solid var(--border-light)' }}>
                    {Array.from({ length: cols }).map((_, c) => (
                        <Skeleton key={c} width={`${100 / cols}%`} height="14px" />
                    ))}
                </div>
            ))}
        </div>
    );
}

/** Dashboard grid skeleton */
function SkeletonDashboard() {
    return (
        <div className="animate-fade">
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <SkeletonCard lines={4} />
                <SkeletonCard lines={4} />
            </div>
        </div>
    );
}

export { Skeleton, SkeletonCard, SkeletonStat, SkeletonTable, SkeletonDashboard };
