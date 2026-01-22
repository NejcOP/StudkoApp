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

interface ResetPasswordEmailProps {
  userName?: string;
  resetLink: string;
}

export const ResetPasswordEmail = ({
  userName = 'Študent',
  resetLink,
}: ResetPasswordEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Ponastavi svoje geslo v nekaj korakih</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={heading}>🔑 Študko</Heading>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading as="h2" style={title}>
              Ponastavitev gesla
            </Heading>
            
            <Text style={text}>
              Živjo, {userName}! 👋
            </Text>

            <Text style={text}>
              Prejeli smo tvojo prošnjo za ponastavitev gesla. <strong>Nič ne skrbi, vsem se zgodi!</strong> 
              Klikni na gumb spodaj in ustvari novo, varno geslo.
            </Text>

            <Button style={button} href={resetLink}>
              Ustvari novo geslo
            </Button>

            <Text style={textSmall}>
              Če gumb ne deluje, kopiraj in prilepi to povezavo v brskalnik:
            </Text>
            <Text style={codeText}>{resetLink}</Text>

            <Section style={infoBox}>
              <Text style={infoText}>
                ⏰ <strong>Pomembno:</strong> Ta povezava poteče v <strong>1 uri</strong> zaradi varnosti.
              </Text>
            </Section>

            <Section style={warningBox}>
              <Text style={warningText}>
                ⚠️ Če nisi zahteval/a ponastavitve gesla, lahko prezreš ta e-mail. 
                Tvoje geslo bo ostalo nespremenjeno.
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Ekipa Študko 🚀 | Več kot le zapiski.
            </Text>
            <Text style={footerSmall}>
              Če imaš težave, nam piši na info@studko.si
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default ResetPasswordEmail;

// Styles (reused from welcome.tsx)
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
  backgroundColor: '#e3f2fd',
  borderLeft: '4px solid #2196f3',
  padding: '16px',
  marginTop: '24px',
  borderRadius: '4px',
};

const infoText = {
  color: '#0d47a1',
  fontSize: '14px',
  margin: '0',
};

const warningBox = {
  backgroundColor: '#fff3cd',
  borderLeft: '4px solid #ffc107',
  padding: '16px',
  marginTop: '16px',
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
