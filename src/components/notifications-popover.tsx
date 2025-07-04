'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, writeBatch, doc, updateDoc, limit } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, CheckCheck } from 'lucide-react';

interface Notification {
  id: string;
  message: string;
  link: string;
  isRead: boolean;
  timestamp: Date;
}

export default function NotificationsPopover() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            setNotifications([]);
            return;
        }

        setLoading(true);
        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const notificationsData = snap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    message: data.message,
                    link: data.link,
                    isRead: data.isRead,
                    timestamp: data.timestamp?.toDate() || new Date(),
                };
            });
            setNotifications(notificationsData as Notification[]);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching notifications:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleMarkAllAsRead = async () => {
        if (!user) return;
        
        const unreadNotifications = notifications.filter(n => !n.isRead);
        if (unreadNotifications.length === 0) return;

        const batch = writeBatch(db);
        unreadNotifications.forEach(n => {
            const notifRef = doc(db, 'notifications', n.id);
            batch.update(notifRef, { isRead: true });
        });
        await batch.commit();
    };
    
    const handleNotificationClick = async (notificationId: string, isRead: boolean) => {
        if (!isRead) {
            const notifRef = doc(db, 'notifications', notificationId);
            await updateDoc(notifRef, { isRead: true });
        }
        setIsOpen(false);
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="relative ml-auto sm:ml-0 h-10 w-10">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0">{unreadCount < 10 ? unreadCount : '9+'}</Badge>
                    )}
                    <span className="sr-only">Toggle notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <Card className="border-0">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-headline">Notifications</CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllAsRead}
                            disabled={unreadCount === 0}
                        >
                            <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
                        </Button>
                    </CardHeader>
                    <CardContent className="p-2 max-h-96 overflow-y-auto">
                        {loading && (
                            <div className="space-y-3 p-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="flex items-center space-x-4">
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                ))}
                            </div>
                        )}
                        {!loading && notifications.length === 0 && (
                            <div className="text-center text-muted-foreground p-8">
                                <p>You're all caught up!</p>
                            </div>
                        )}
                        <div className="space-y-2">
                            {notifications.map(notification => (
                                <Link
                                    key={notification.id}
                                    href={notification.link}
                                    onClick={() => handleNotificationClick(notification.id, notification.isRead)}
                                    className={`block rounded-md p-3 transition-colors ${
                                        notification.isRead
                                            ? 'hover:bg-muted/50'
                                            : 'bg-accent hover:bg-accent/80'
                                    }`}
                                >
                                    <p className="text-sm">{notification.message}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </PopoverContent>
        </Popover>
    );
}
