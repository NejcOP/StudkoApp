import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface WelcomeEmailProps {
  userName?: string;
  confirmLink: string;
}

const baseUrl = 'https://studko.si';

export const WelcomeEmail = ({
  userName = 'Študent',
  confirmLink,
}: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Dobrodošel/a na Študku! Potrdi svoj račun in začni uporabljati vse funkcije.</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={heading}>📚 Študko</Heading>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading as="h2" style={title}>
              Dobrodošel/a na Študku, {userName}! 🎉
            </Heading>
            
            <Text style={text}>
              Super, da si se odločil/a pridružiti naši skupnosti študentov! 
              Na Študku te čakajo zapiski, kvizi, AI asistent in še veliko več.
            </Text>

            <Text style={text}>
              Samo še en majhen korak te loči od začetka - <strong>potrdi svoj e-naslov</strong>:
            </Text>

            <Button style={button} href={confirmLink}>
              Potrdi moj račun
            </Button>

            <Text style={textSmall}>
              Če gumb ne deluje, kopiraj in prilepi to povezavo v brskalnik:
            </Text>
            <Text style={codeText}>{confirmLink}</Text>

            <Section style={warningBox}>
              <Text style={warningText}>
                ⚠️ <strong>Varnost:</strong> Ta povezava je veljavna 24 ur. Nikoli je ne deli z nikomer.
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Ekipa Študko 🚀 | Več kot le zapiski.
            </Text>
            <Text style={footerSmall}>
              Če nisi ustvaril tega računa, lahko prezreš ta e-mail.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
  padding: '40px 0',
  textAlign: 'center' as const,
};

const heading = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: '700',
  margin: '0',
};

const content = {
  padding: '40px 30px',
};

const title = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  marginBottom: '20px',
};

const text = {
  color: '#333333',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '16px 0',
};

const textSmall = {
  color: '#666666',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '20px 0 10px',
};

const button = {
  backgroundColor: '#7C3AED',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 32px',
  margin: '24px 0',
};

const codeText = {
  backgroundColor: '#f5f5f5',
  padding: '12px',
  fontSize: '12px',
  color: '#666',
  wordBreak: 'break-all' as const,
  borderRadius: '4px',
  fontFamily: 'monospace',
};

const warningBox = {
  backgroundColor: '#fff3cd',
  borderLeft: '4px solid #ffc107',
  padding: '16px',
  marginTop: '24px',
  borderRadius: '4px',
};

const warningText = {
  color: '#856404',
  fontSize: '14px',
  margin: '0',
};

const footer = {
  backgroundColor: '#f9f9f9',
  padding: '30px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#7C3AED',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 10px',
};

const footerSmall = {
  color: '#999999',
  fontSize: '12px',
  margin: '0',
};
