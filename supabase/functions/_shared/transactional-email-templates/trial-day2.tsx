/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// Sent once, two days after a $5 trial purchase, while the trial is still running (trial-day2 function).
// The code is single use, minted for this email address only (executor promo_coupons, kind "upgrade").
const SITE_NAME = 'Combo_WICK'

interface TrialDay2Props {
  code?: string
  expires?: string          // already formatted, e.g. "Nov 8"
  daysLeft?: number
  games?: string[]          // newest games added this week, can be empty
  link?: string             // https://keys.combowick.com/premium-keys?promo=CODE&src=email-day2
  unsubscribeUrl?: string   // added by send-transactional-email
}

const TrialDay2Email = ({ code = 'UPGRADE-XXXXXX', expires = 'in 7 days', daysLeft = 5, games = [], link = 'https://keys.combowick.com/premium-keys', unsubscribeUrl }: TrialDay2Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${daysLeft} days of Premium left, and what's new this week`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>COMBO_WICK</Heading>
        </Section>
        <Section style={card}>
          <Text style={text}>Hey,</Text>
          <Text style={text}>Your Premium still has {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left. It works in every game we support, with no key steps.</Text>
          {games.length > 0 ? (
            <>
              <Text style={text}>New this week:</Text>
              {games.map((g) => <Text key={g} style={gameText}>{g}</Text>)}
            </>
          ) : null}
          <Text style={text}>Want to keep Premium after that? Here's 20% off, just for you:</Text>
          <Section style={codeBox}>
            <Text style={codeLabel}>YOUR CODE</Text>
            <Text style={codeText}>{code}</Text>
          </Section>
          <Text style={text}>The code works once and runs out on {expires}.</Text>
          <Section style={{ textAlign: 'center' as const, margin: '8px 0 20px' }}>
            <Button href={link} style={button}>Keep Premium with 20% off</Button>
          </Section>
          <Text style={small}>Questions? Ask us on Discord: <Link href="https://discord.gg/9FWBQnVXCy" style={link2}>discord.gg/9FWBQnVXCy</Link></Text>
          <Text style={text}>COMBO_WICK</Text>
        </Section>
        <Text style={footer}>
          © {SITE_NAME} · combowick.com
          {unsubscribeUrl ? <><br /><Link href={unsubscribeUrl} style={footerLink}>Don't want these emails? Unsubscribe</Link></> : null}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TrialDay2Email,
  subject: "Your COMBO_WICK Premium: what's new this week",
  displayName: 'Trial day 2: new games + 20% off',
  previewData: { code: 'UPGRADE-AB12CD', expires: 'Nov 8', daysLeft: 5, games: ['Example Game One', 'Example Game Two'], link: 'https://keys.combowick.com/premium-keys?promo=UPGRADE-AB12CD&src=email-day2' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', padding: '24px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 16px' }
const header = { textAlign: 'center' as const, padding: '8px 0 20px' }
const brand = { fontFamily: 'Orbitron, Arial, sans-serif', fontSize: '20px', fontWeight: 800 as const, letterSpacing: '4px', color: '#b8860b', margin: 0 }
const card = { background: '#fffdf6', border: '1px solid #f1e3b5', borderRadius: '12px', padding: '28px 28px 12px' }
const text = { fontSize: '15px', color: '#3d3a33', lineHeight: '1.6', margin: '0 0 14px' }
const gameText = { fontSize: '15px', color: '#3d3a33', fontWeight: 700 as const, lineHeight: '1.5', margin: '0 0 6px 12px' }
const small = { fontSize: '13px', color: '#6b675d', lineHeight: '1.6', margin: '0 0 10px' }
const codeBox = { background: '#111111', borderRadius: '10px', padding: '16px', margin: '4px 0 16px', textAlign: 'center' as const }
const codeLabel = { fontSize: '11px', letterSpacing: '3px', color: '#9ca3af', margin: '0 0 4px' }
const codeText = { fontFamily: 'Consolas, Menlo, monospace', fontSize: '24px', fontWeight: 700 as const, letterSpacing: '2px', color: '#f5b700', margin: 0 }
const button = { backgroundColor: '#f5b700', color: '#141006', fontWeight: 700 as const, fontSize: '15px', borderRadius: '8px', padding: '12px 22px', textDecoration: 'none' }
const link2 = { color: '#b8860b' }
const footer = { fontSize: '12px', color: '#9b96b0', textAlign: 'center' as const, margin: '24px 0 0', lineHeight: '1.6' }
const footerLink = { color: '#9b96b0', textDecoration: 'underline' }
