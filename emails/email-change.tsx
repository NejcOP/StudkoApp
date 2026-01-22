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

interface EmailChangeEmailProps {
  userName?: string;
  newEmail: string;
  confirmLink: string;
}

export const EmailChangeEmail = ({
  userName = 'Študent',
  newEmail,
  confirmLink,
}: EmailChangeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Potrdi spremembo svojega e-poštnega naslova</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={heading}>📧 Študko</Heading>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading as="h2" style={title}>
              Potrdi spremembo e-naslova
            </Heading>
            
            <Text style={text}>
              Živjo, {userName}! 👋
            </Text>

            <Text style={text}>
              Zahtevana je bila sprememba e-poštnega naslova za tvoj Študko račun.
            </Text>

            <Section style={infoBox}>
              <Text style={infoLabel}>Nov e-naslov:</Text>
              <Text style={infoValue}>{newEmail}</Text>
            </Section>

            <Text style={text}>
              Za dokončanje spremembe klikni na gumb spodaj:
            </Text>

            <Button style={button} href={confirmLink}>
              Potrdi spremembo
            </Button>

            <Text style={textSmall}>
              Če gumb ne deluje, kopiraj in prilepi to povezavo v brskalnik:
            </Text>
            <Text style={codeText}>{confirmLink}</Text>

            <Section style={warningBox}>
              <Text style={warningText}>
                ⚠️ <strong>Varnostno opozorilo:</strong> Če nisi zahteval/a te spremembe, 
                <strong> takoj se prijavi v svoj račun in spremeni geslo</strong>. Nekdo morda poskuša 
                dostopati do tvojega računa.
              </Text>
            </Section>

            <Section style={tipBox}>
              <Text style={tipText}>
                💡 Po potrditvi se boš moral/a ponovno prijaviti z novim e-naslovom.
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Ekipa Študko 🚀 | Več kot le zapiski.
            </Text>
            <Text style={footerSmall}>
              Potrebuješ pomoč? Piši nam na info@studko.si
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default EmailChangeEmail;

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

const infoBox = {
  backgroundColor: '#f8f5ff',
  borderLeft: '4px solid #7C3AED',
  padding: '20px',
  marginTop: '24px',
  borderRadius: '4px',
};

const infoLabel = {
  color: '#7C3AED',
  fontSize: '14px',
  fontWeight: '600',
  marginBottom: '8px',
};

const infoValue = {
  color: '#333333',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
};

const warningBox = {
  backgroundColor: '#fee2e2',
  borderLeft: '4px solid #ef4444',
  padding: '16px',
  marginTop: '24px',
  borderRadius: '4px',
};

const warningText = {
  color: '#991b1b',
  fontSize: '14px',
  margin: '0',
};

const tipBox = {
  backgroundColor: '#e3f2fd',
  borderLeft: '4px solid #2196f3',
  padding: '16px',
  marginTop: '16px',
  borderRadius: '4px',
};

const tipText = {
  color: '#0d47a1',
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
