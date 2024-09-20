import Stripe from 'stripe'
import * as env from './config/env.config'

const stripeAPI = new Stripe(env.STRIPE_SECRET_KEY)

export default stripeAPI
