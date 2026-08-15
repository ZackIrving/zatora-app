import { useState } from 'react'
import { supabase } from '../supabaseClient'

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; i += 1) {
        outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
}

export function usePushNotifications(user) {
    const [pushStatus, setPushStatus] = useState('')

    async function enablePushNotifications() {
        if (!user) return

        if (!('serviceWorker' in navigator)) {
            setPushStatus('Service workers are not supported on this device.')
            return
        }

        if (!('PushManager' in window)) {
            setPushStatus('Push notifications are not supported on this device.')
            return
        }

        let permission = Notification.permission

        if (permission === 'default') {
            permission = await Notification.requestPermission()
        }

        if (permission !== 'granted') {
            setPushStatus(
                'Push notifications were not enabled. Check your browser site settings and allow notifications for Zatora.'
            )
            return
        }

        setPushStatus('Permission granted. Creating push subscription...')

        const registration = await navigator.serviceWorker.ready

        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

        let subscription = await registration.pushManager.getSubscription()

        if (!subscription) {
            try {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
                })

            } catch (subscriptionError) {
                console.error('PUSH SUBSCRIPTION ERROR:', subscriptionError)
                setPushStatus(
                    `Could not create push subscription: ${subscriptionError.name}`
                )
                return
            }
        } 

        const subscriptionJson = subscription.toJSON()

        const { error } = await supabase
            .from('push_subscriptions')
            .upsert(
                {
                    user_id: user.id,
                    endpoint: subscriptionJson.endpoint,
                    p256dh_key: subscriptionJson.keys.p256dh,
                    auth_key: subscriptionJson.keys.auth,
                },
                {
                    onConflict: 'endpoint',
                }
            )

        if (error) {
            console.error('Error saving push subscription:', error)
            setPushStatus('Could not save push subscription.')
            return
        }

        setPushStatus('Push notifications enabled for this device.')
    }

    return {
        pushStatus,
        enablePushNotifications,
    }
}