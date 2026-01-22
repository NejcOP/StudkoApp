import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface PayoutConfirmationEmailProps {
  userName?: string;
  amount: number;
  method: string;
}

export const PayoutConfirmationEmail = ({
  userName = 'Študent',
  amount,
  method,
}: PayoutConfirmationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Tvoj zahtevek za izplačilo je prejet!</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={heading}>💸 Študko</Heading>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading as="h2" style={title}>
              Tvoj zahtevek za izplačilo je prejet! 💰
            </Heading>
            
            <Text style={text}>
              Bravo, {userName}! 🎉
            </Text>

            <Text style={text}>
              Tvoj zaslužek od prodaje zapiskov je na poti. Uspešno smo prejeli tvoj zahtevek 
              za izplačilo in ga že obdelujemo.
            </Text>

            <Section style={detailsBox}>
              <Heading as="h3" style={detailsTitle}>
                📋 Podrobnosti izplačila:
              </Heading>
              <Section style={detailRow}>
                <Text style={detailLabel}>Znesek:</Text>
                <Text style={detailValue}>{amount.toFixed(2)} €</Text>
              </Section>
              <Section style={detailRow}>
                <Text style={detailLabel}>Način:</Text>
                <Text style={detailValue}>{method}</Text>
              </Section>
              <Section style={detailRow}>
                <Text style={detailLabel}>Status:</Text>
                <Text style={detailValueActive}>✓ V obdelavi</Text>
              </Section>
            </Section>

            <Section style={infoBox}>
              <Text style={infoText}>
                ⏰ <strong>Rok izplačila:</strong> Denar bo na tvojem računu v <strong>3-5 delovnih dneh</strong>.
              </Text>
            </Section>

            <Text style={text}>
              Ko bo izplačilo opravljeno, boš prejel/a dodatno obvestilo.
            </Text>

            <Section style={tipBox}>
              <Text style={tipText}>
                💡 <strong>Nasvet:</strong> Nadaljuj s prodajanjem kakovostnih zapiskov in povečaj svoj zaslužek!
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Ekipa Študko 🚀 | Več kot le zapiski.
            </Text>
            <Text style={footerSmall}>
              Vprašanja? Piši nam na info@studko.si
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default PayoutConfirmationEmail;

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

const detailsBox = {
  backgroundColor: '#f8f5ff',
  borderLeft: '4px solid #7C3AED',
  padding: '24px',
  marginTop: '24px',
  borderRadius: '4px',
};

const detailsTitle = {
  color: '#7C3AED',
  fontSize: '18px',
  fontWeight: '600',
  marginTop: '0',
  marginBottom: '16px',
};

const detailRow = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '12px',
};

const detailLabel = {
  color: '#666666',
  fontSize: '15px',
  margin: '0',
};

const detailValue = {
  color: '#333333',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0',
};

const detailValueActive = {
  color: '#10b981',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0',
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

const tipBox = {
  backgroundColor: '#fef3c7',
  borderLeft: '4px solid #f59e0b',
  padding: '16px',
  marginTop: '24px',
  borderRadius: '4px',
};

const tipText = {
  color: '#92400e',
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
