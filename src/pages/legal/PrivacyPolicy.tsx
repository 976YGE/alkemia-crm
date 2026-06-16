import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Shield } from 'lucide-react';

const privacyContent: Record<string, React.ReactNode> = {
  fr: (
    <div className="prose prose-sm max-w-none text-slate-700">
      <p className="lead text-base text-slate-600 mb-6">
        PATYKA accorde une importance primordiale à la protection de la vie privée et des données à caractère personnel de l'ensemble de ses parties prenantes : clients, prospects, employés, fournisseurs, partenaires commerciaux et visiteurs de ses locaux ou de ses plateformes numériques.
      </p>
      <p className="text-base text-slate-600 mb-8">
        La présente Politique de Confidentialité (la « Politique ») décrit les règles que PATYKA applique lorsqu'elle collecte, traite, conserve et protège les informations se rapportant directement ou indirectement à toute personne physique identifiée ou identifiable (les « Données à Caractère Personnel »).
      </p>

      <Section title="ARTICLE 1. CHAMP D'APPLICATION ET DÉFINITIONS">
        <SubSection title="1.1. Champ d'application">
          <p>Cette Politique s'applique à l'ensemble des traitements de Données à Caractère Personnel effectués par PATYKA dans le cadre de :</p>
          <ul>
            <li>Ses activités commerciales (vente en ligne, vente en boutique, marketplace)</li>
            <li>Ses activités marketing et communication</li>
            <li>La gestion de ses ressources humaines</li>
            <li>Ses relations avec les fournisseurs et partenaires</li>
            <li>La gestion de ses locaux et la sécurité</li>
            <li>Toute autre activité opérationnelle de l'entreprise</li>
          </ul>
        </SubSection>
        <SubSection title="1.2. Responsable du traitement">
          <p>PATYKA COSMETICS, société par actions simplifiée au capital de 13 281 euros, immatriculée au Registre du Commerce et des Sociétés de Paris sous le numéro 791 258 874, dont le siège social est situé 58 rue de Châteaudun, 75009 Paris, France, est le responsable du traitement des Données à Caractère Personnel collectées.</p>
          <p className="font-semibold mt-2">Contact du Délégué à la Protection des Données (DPO) : <a href="mailto:dpo@patyka.com" className="text-brand-600 hover:underline">dpo@patyka.com</a></p>
        </SubSection>
        <SubSection title="1.3. Définitions">
          <ul>
            <li>« <strong>Personne Concernée</strong> » : toute personne physique dont les Données à Caractère Personnel sont traitées par PATYKA</li>
            <li>« <strong>Traitement</strong> » : toute opération appliquée à des données personnelles (collecte, enregistrement, organisation, conservation, adaptation, modification, extraction, consultation, utilisation, communication, diffusion, effacement, destruction)</li>
            <li>« <strong>Sous-traitant</strong> » : toute personne physique ou morale qui traite des Données à Caractère Personnel pour le compte de PATYKA</li>
          </ul>
        </SubSection>
      </Section>

      <Section title="ARTICLE 2. CADRE JURIDIQUE ET PRINCIPES">
        <SubSection title="2.1. Textes applicables">
          <p>PATYKA traite les Données à Caractère Personnel conformément à :</p>
          <ul>
            <li>Le Règlement (UE) n°2016/679 du 27 avril 2016 relatif à la protection des personnes physiques à l'égard du traitement des données à caractère personnel (RGPD)</li>
            <li>La Loi n°78-17 du 6 janvier 1978 relative à l'informatique, aux fichiers et aux libertés, dite « Informatique et Libertés », modifiée</li>
            <li>Toute autre règlementation applicable en matière de protection des données personnelles</li>
          </ul>
        </SubSection>
        <SubSection title="2.2. Principes fondamentaux">
          <p>PATYKA s'engage à respecter les principes suivants :</p>
          <ul>
            <li><strong>Licéité, loyauté et transparence</strong> : les données sont collectées et traitées de manière licite, loyale et transparente</li>
            <li><strong>Limitation des finalités</strong> : les données sont collectées pour des finalités déterminées, explicites et légitimes</li>
            <li><strong>Minimisation des données</strong> : seules les données adéquates, pertinentes et limitées à ce qui est nécessaire sont collectées</li>
            <li><strong>Exactitude</strong> : les données sont exactes et, si nécessaire, tenues à jour</li>
            <li><strong>Conservation limitée</strong> : les données sont conservées pendant une durée n'excédant pas celle nécessaire aux finalités</li>
            <li><strong>Intégrité et confidentialité</strong> : les données sont traitées de façon à garantir leur sécurité</li>
            <li><strong>Responsabilité</strong> : PATYKA est en mesure de démontrer sa conformité avec ces principes</li>
          </ul>
        </SubSection>
      </Section>

      <Section title="ARTICLE 3. DONNÉES COLLECTÉES ET FINALITÉS DES TRAITEMENTS">
        <SubSection title="3.1. Activités commerciales et relation client">
          <p className="font-medium mb-2">Données collectées :</p>
          <ul>
            <li>Données d'identité : nom, prénom, civilité, date de naissance</li>
            <li>Coordonnées : adresse postale, adresse email, numéro de téléphone</li>
            <li>Données de commande : numéro de transaction, détail des achats, montants, historique d'achats</li>
            <li>Données de paiement : collectées par les prestataires de paiement</li>
            <li>Données de navigation : pages visitées, produits consultés, liste de souhaits</li>
            <li>Avis clients : contenu des avis, notes, commentaires</li>
          </ul>
          <DataTable
            headers={['Finalité', 'Base légale', 'Durée de conservation']}
            rows={[
              ['Gestion des commandes et de la relation commerciale', 'Exécution du contrat de vente', '5 ans après la commande'],
              ['Conservation des factures', 'Obligation légale', '10 ans'],
              ['Programme de fidélité', 'Exécution du contrat', 'Durée d\'adhésion + 3 ans'],
              ['Gestion des avis clients', 'Intérêt légitime', '3 ans ou retrait de l\'avis'],
              ['Prévention de la fraude', 'Intérêt légitime', 'Durée nécessaire à la résolution du litige'],
            ]}
          />
        </SubSection>
        <SubSection title="3.2. Marketing et communication">
          <DataTable
            headers={['Finalité', 'Base légale', 'Durée de conservation']}
            rows={[
              ['Envoi de newsletters et offres promotionnelles', 'Consentement', '3 ans après le dernier contact'],
              ['Publicité ciblée en ligne', 'Consentement (cookies)', '13 mois'],
              ['Amélioration de l\'expérience utilisateur', 'Intérêt légitime', 'Durée de l\'analyse'],
            ]}
          />
        </SubSection>
        <SubSection title="3.3. Ressources humaines">
          <p>Durées de conservation : CV des candidats non retenus (2 ans), dossiers du personnel (5 ans après le départ), bulletins de paie (50 ans).</p>
        </SubSection>
        <SubSection title="3.4. Fournisseurs et partenaires commerciaux">
          <p>Base légale : exécution du contrat et obligations légales | Conservation : durée de la relation commerciale + 5 ans</p>
        </SubSection>
        <SubSection title="3.5. Sécurité et vidéosurveillance">
          <p>Base légale : intérêt légitime de PATYKA | Conservation : 30 jours maximum, sauf incident nécessitant conservation à titre de preuve.</p>
          <p className="italic mt-1">Des panneaux d'information sont affichés aux entrées des zones surveillées.</p>
        </SubSection>
      </Section>

      <Section title="ARTICLE 4. SÉCURITÉ ET PROTECTION DES DONNÉES">
        <SubSection title="4.1. Mesures de sécurité techniques et organisationnelles">
          <ul>
            <li>Pseudonymisation et chiffrement des données sensibles</li>
            <li>Garantie de confidentialité, d'intégrité, de disponibilité et de résilience des systèmes</li>
            <li>Procédures de restauration de la disponibilité et d'accès aux données en cas d'incident</li>
            <li>Gestion rigoureuse des accès et des habilitations</li>
            <li>Sensibilisation et formation du personnel à la protection des données</li>
          </ul>
        </SubSection>
        <SubSection title="4.2. Hébergement et localisation des données">
          <p>Les Données à Caractère Personnel sont principalement hébergées par Cloudflare, Shopify (serveurs en Irlande et au Canada), sur des serveurs situés au sein de l'Union Européenne dans la mesure du possible.</p>
        </SubSection>
        <SubSection title="4.3. Notification des violations de données">
          <p>En cas de violation de données personnelles susceptible d'engendrer un risque, PATYKA s'engage à :</p>
          <ul>
            <li>Notifier la violation à la CNIL dans les 72 heures</li>
            <li>Informer les personnes concernées si le risque est élevé</li>
          </ul>
        </SubSection>
      </Section>

      <Section title="ARTICLE 5. TRANSFERTS DE DONNÉES ET DESTINATAIRES">
        <SubSection title="5.2. Sous-traitants et prestataires">
          <DataTable
            headers={['Prestataire', 'Service', 'Localisation', 'Garanties']}
            rows={[
              ['Shopify', 'Plateforme e-commerce', 'Irlande, Canada', 'Décision d\'adéquation'],
              ['Cloudflare', 'Hébergement et sécurité', 'UE et hors UE', 'Clauses contractuelles types'],
              ['KLAVIYO', 'Emailing', 'États-Unis', 'Clauses contractuelles types'],
              ['Stripe, ALMA', 'Paiement en ligne', 'Union Européenne', 'N/A'],
              ['PayPal', 'Paiement en ligne', 'UE et hors UE', 'BCR + CCT'],
              ['Microsoft', 'Documents & mails', 'UK', 'DPA'],
              ['Google, Facebook, Pinterest, Microsoft', 'Publicité en ligne', 'Mondial', 'CCT / Consent Framework'],
            ]}
          />
          <p className="italic mt-3">Tous les sous-traitants sont liés à PATYKA par des contrats conformes à l'article 28 du RGPD.</p>
        </SubSection>
      </Section>

      <Section title="ARTICLE 6. COOKIES ET TRACEURS">
        <p>PATYKA utilise des cookies et autres traceurs sur son site web. Les utilisateurs peuvent à tout moment paramétrer leurs préférences en matière de cookies via le bandeau de gestion des cookies présent sur le site.</p>
      </Section>

      <Section title="ARTICLE 7. DROITS DES PERSONNES CONCERNÉES">
        <SubSection title="7.1. Liste des droits">
          <ul>
            <li><strong>Droit d'accès</strong> : obtenir la confirmation que des données vous concernant sont traitées</li>
            <li><strong>Droit de rectification</strong> : faire corriger des données inexactes ou incomplètes</li>
            <li><strong>Droit à l'effacement</strong> (« droit à l'oubli ») : demander la suppression de vos données</li>
            <li><strong>Droit à la limitation du traitement</strong> : demander la limitation du traitement de vos données</li>
            <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré et lisible</li>
            <li><strong>Droit d'opposition</strong> : vous opposer au traitement de vos données pour des motifs légitimes</li>
            <li><strong>Droit de retirer votre consentement</strong> : lorsque le traitement est fondé sur le consentement</li>
            <li><strong>Droit d'introduire une réclamation auprès de la CNIL</strong></li>
          </ul>
        </SubSection>
        <SubSection title="7.2. Modalités d'exercice des droits">
          <p>Pour exercer vos droits :</p>
          <ul>
            <li>Par email à : <a href="mailto:dpo@patyka.com" className="text-brand-600 hover:underline">dpo@patyka.com</a></li>
            <li>Par courrier postal à : PATYKA – 58 rue de Châteaudun – 75009 Paris – À l'attention du DPO</li>
          </ul>
          <p className="mt-2">Votre demande doit être accompagnée d'une copie d'un titre d'identité signé. PATYKA dispose d'un délai d'un (1) mois pour répondre.</p>
        </SubSection>
        <SubSection title="7.4. Réclamation auprès de la CNIL">
          <p>CNIL – 3 Place de Fontenoy – TSA 80715 – 75334 PARIS CEDEX 07</p>
          <p>Tél : 01 53 73 22 22 | Site web : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">www.cnil.fr</a></p>
        </SubSection>
      </Section>

      <Section title="ARTICLE 8. MINEURS">
        <p>Les services de PATYKA ne sont pas destinés aux personnes mineures de moins de 15 ans. PATYKA ne collecte pas sciemment de données personnelles concernant des mineurs de moins de 15 ans.</p>
      </Section>

      <Section title="ARTICLE 9. MODIFICATIONS DE LA POLITIQUE">
        <p>PATYKA se réserve le droit de modifier ou de mettre à jour la présente Politique de Confidentialité à tout moment pour refléter les évolutions de ses pratiques, de ses services ou des exigences légales.</p>
      </Section>

      <Section title="ARTICLE 10. CONTACT ET INFORMATIONS COMPLÉMENTAIRES">
        <p className="font-semibold">Le Délégué à la Protection des Données (DPO) de PATYKA</p>
        <p>Courriel : <a href="mailto:DPO@patyka.com" className="text-brand-600 hover:underline">DPO@patyka.com</a></p>
        <p>Adresse postale : PATYKA – 58 rue de Châteaudun – 75009 Paris</p>
      </Section>
    </div>
  ),
  en: (
    <div className="prose prose-sm max-w-none text-slate-700">
      <p className="text-base text-slate-600 mb-6">
        PATYKA places paramount importance on protecting the privacy and personal data of all its stakeholders: customers, prospects, employees, suppliers, business partners and visitors to its premises or digital platforms.
      </p>
      <p className="text-base text-slate-600 mb-8">
        This Privacy Policy (the "Policy") describes the rules PATYKA applies when it collects, processes, stores and protects information relating directly or indirectly to any identified or identifiable natural person ("Personal Data").
      </p>

      <Section title="ARTICLE 1. SCOPE AND DEFINITIONS">
        <SubSection title="1.1. Scope">
          <p>This Policy applies to all processing of Personal Data carried out by PATYKA in connection with:</p>
          <ul>
            <li>Its commercial activities (online sales, in-store sales, marketplace)</li>
            <li>Its marketing and communication activities</li>
            <li>Human resources management</li>
            <li>Relations with suppliers and partners</li>
            <li>Premises management and security</li>
            <li>Any other operational activity of the company</li>
          </ul>
        </SubSection>
        <SubSection title="1.2. Data Controller">
          <p>PATYKA COSMETICS, a simplified joint-stock company with share capital of €13,281, registered with the Paris Trade and Companies Register under number 791 258 874, with registered office at 58 rue de Châteaudun, 75009 Paris, France, is the controller of the Personal Data collected.</p>
          <p className="font-semibold mt-2">Data Protection Officer (DPO): <a href="mailto:dpo@patyka.com" className="text-brand-600 hover:underline">dpo@patyka.com</a></p>
        </SubSection>
      </Section>

      <Section title="ARTICLE 2. LEGAL FRAMEWORK AND PRINCIPLES">
        <SubSection title="2.1. Applicable texts">
          <ul>
            <li>Regulation (EU) No. 2016/679 of 27 April 2016 (GDPR)</li>
            <li>French Act No. 78-17 of 6 January 1978 on data processing, files and individual liberties</li>
            <li>Any other applicable regulation on personal data protection</li>
          </ul>
        </SubSection>
        <SubSection title="2.2. Fundamental principles">
          <ul>
            <li><strong>Lawfulness, fairness and transparency</strong></li>
            <li><strong>Purpose limitation</strong></li>
            <li><strong>Data minimisation</strong></li>
            <li><strong>Accuracy</strong></li>
            <li><strong>Storage limitation</strong></li>
            <li><strong>Integrity and confidentiality</strong></li>
            <li><strong>Accountability</strong></li>
          </ul>
        </SubSection>
      </Section>

      <Section title="ARTICLE 3. DATA COLLECTED AND PURPOSES">
        <SubSection title="3.1. Commercial activities and customer relations">
          <DataTable
            headers={['Purpose', 'Legal basis', 'Retention period']}
            rows={[
              ['Order management', 'Performance of the sales contract', '5 years after the order'],
              ['Invoice retention', 'Legal obligation', '10 years'],
              ['Loyalty programme', 'Performance of contract', 'Membership period + 3 years'],
              ['Customer reviews', 'Legitimate interest', '3 years or withdrawal of review'],
              ['Fraud prevention', 'Legitimate interest', 'Duration necessary to resolve the dispute'],
            ]}
          />
        </SubSection>
        <SubSection title="3.2. Marketing and communication">
          <DataTable
            headers={['Purpose', 'Legal basis', 'Retention period']}
            rows={[
              ['Newsletters and promotional offers', 'Consent', '3 years after last contact'],
              ['Online targeted advertising', 'Consent (cookies)', '13 months'],
              ['Improving user experience', 'Legitimate interest', 'Duration of analysis'],
            ]}
          />
        </SubSection>
      </Section>

      <Section title="ARTICLE 4. SECURITY AND DATA PROTECTION">
        <p>PATYKA implements all appropriate technical and organisational measures to ensure a level of security appropriate to the risk, including pseudonymisation, encryption, access management and staff training.</p>
        <SubSection title="4.3. Data breach notification">
          <ul>
            <li>Notify the CNIL within 72 hours</li>
            <li>Inform data subjects if the risk is high</li>
          </ul>
        </SubSection>
      </Section>

      <Section title="ARTICLE 5. DATA TRANSFERS AND RECIPIENTS">
        <SubSection title="5.2. Sub-contractors and service providers">
          <DataTable
            headers={['Provider', 'Service', 'Location', 'Safeguards']}
            rows={[
              ['Shopify', 'E-commerce platform', 'Ireland, Canada', 'Adequacy decision'],
              ['Cloudflare', 'Hosting & security', 'EU and outside EU', 'Standard contractual clauses'],
              ['KLAVIYO', 'Emailing', 'United States', 'Standard contractual clauses'],
              ['Stripe, ALMA', 'Online payment', 'European Union', 'N/A'],
              ['PayPal', 'Online payment', 'EU and outside EU', 'BCR + SCC'],
              ['Microsoft', 'Documents & email', 'UK', 'DPA'],
            ]}
          />
        </SubSection>
      </Section>

      <Section title="ARTICLE 7. RIGHTS OF DATA SUBJECTS">
        <SubSection title="7.1. List of rights">
          <ul>
            <li><strong>Right of access</strong></li>
            <li><strong>Right of rectification</strong></li>
            <li><strong>Right to erasure</strong> ("right to be forgotten")</li>
            <li><strong>Right to restriction of processing</strong></li>
            <li><strong>Right to data portability</strong></li>
            <li><strong>Right to object</strong></li>
            <li><strong>Right to withdraw consent</strong></li>
            <li><strong>Right to lodge a complaint with the CNIL</strong></li>
          </ul>
        </SubSection>
        <SubSection title="7.2. How to exercise your rights">
          <ul>
            <li>By email: <a href="mailto:dpo@patyka.com" className="text-brand-600 hover:underline">dpo@patyka.com</a></li>
            <li>By post: PATYKA – 58 rue de Châteaudun – 75009 Paris – Attn: DPO</li>
          </ul>
        </SubSection>
      </Section>

      <Section title="ARTICLE 10. CONTACT">
        <p className="font-semibold">PATYKA Data Protection Officer (DPO)</p>
        <p>Email: <a href="mailto:DPO@patyka.com" className="text-brand-600 hover:underline">DPO@patyka.com</a></p>
        <p>Postal address: PATYKA – 58 rue de Châteaudun – 75009 Paris</p>
      </Section>
    </div>
  ),
  de: (
    <div className="prose prose-sm max-w-none text-slate-700">
      <p className="text-base text-slate-600 mb-8">
        PATYKA legt höchsten Wert auf den Schutz der Privatsphäre und personenbezogener Daten aller seiner Stakeholder. Diese Datenschutzrichtlinie beschreibt die Regeln, die PATYKA bei der Erhebung, Verarbeitung, Speicherung und dem Schutz von Informationen anwendet.
      </p>

      <Section title="ARTIKEL 1. ANWENDUNGSBEREICH UND DEFINITIONEN">
        <SubSection title="1.2. Verantwortlicher">
          <p>PATYKA COSMETICS, vereinfachte Aktiengesellschaft mit einem Kapital von 13.281 Euro, eingetragen beim Handels- und Gesellschaftsregister Paris unter der Nummer 791 258 874, mit Sitz in der 58 rue de Châteaudun, 75009 Paris, Frankreich.</p>
          <p className="font-semibold mt-2">Datenschutzbeauftragter (DSB): <a href="mailto:dpo@patyka.com" className="text-brand-600 hover:underline">dpo@patyka.com</a></p>
        </SubSection>
      </Section>

      <Section title="ARTIKEL 2. RECHTSRAHMEN UND GRUNDSÄTZE">
        <SubSection title="2.1. Anwendbare Rechtsvorschriften">
          <ul>
            <li>Verordnung (EU) Nr. 2016/679 vom 27. April 2016 (DSGVO)</li>
            <li>Französisches Gesetz Nr. 78-17 vom 6. Januar 1978</li>
          </ul>
        </SubSection>
        <SubSection title="2.2. Grundprinzipien">
          <ul>
            <li><strong>Rechtmäßigkeit, Treu und Glauben und Transparenz</strong></li>
            <li><strong>Zweckbindung</strong></li>
            <li><strong>Datenminimierung</strong></li>
            <li><strong>Richtigkeit</strong></li>
            <li><strong>Speicherbegrenzung</strong></li>
            <li><strong>Integrität und Vertraulichkeit</strong></li>
            <li><strong>Rechenschaftspflicht</strong></li>
          </ul>
        </SubSection>
      </Section>

      <Section title="ARTIKEL 3. ERHOBENE DATEN UND VERARBEITUNGSZWECKE">
        <SubSection title="3.1. Geschäftsaktivitäten und Kundenbeziehungen">
          <DataTable
            headers={['Zweck', 'Rechtsgrundlage', 'Aufbewahrungsdauer']}
            rows={[
              ['Auftragsverwaltung', 'Vertragserfüllung', '5 Jahre nach der Bestellung'],
              ['Rechnungsaufbewahrung', 'Gesetzliche Verpflichtung', '10 Jahre'],
              ['Treueprogramm', 'Vertragserfüllung', 'Mitgliedschaftsdauer + 3 Jahre'],
              ['Kundenbewertungen', 'Berechtigtes Interesse', '3 Jahre oder Rückzug der Bewertung'],
            ]}
          />
        </SubSection>
      </Section>

      <Section title="ARTIKEL 4. SICHERHEIT UND DATENSCHUTZ">
        <p>PATYKA trifft alle geeigneten technischen und organisatorischen Maßnahmen, um ein angemessenes Sicherheitsniveau zu gewährleisten, einschließlich Pseudonymisierung, Verschlüsselung, Zugangsverwaltung und Schulung des Personals.</p>
        <SubSection title="4.3. Meldung von Datenpannen">
          <ul>
            <li>Meldung der Verletzung an die CNIL innerhalb von 72 Stunden</li>
            <li>Information der Betroffenen, wenn ein hohes Risiko besteht</li>
          </ul>
        </SubSection>
      </Section>

      <Section title="ARTIKEL 7. RECHTE DER BETROFFENEN PERSONEN">
        <SubSection title="7.1. Auflistung der Rechte">
          <ul>
            <li><strong>Auskunftsrecht</strong></li>
            <li><strong>Recht auf Berichtigung</strong></li>
            <li><strong>Recht auf Löschung</strong> („Recht auf Vergessenwerden")</li>
            <li><strong>Recht auf Einschränkung der Verarbeitung</strong></li>
            <li><strong>Recht auf Datenübertragbarkeit</strong></li>
            <li><strong>Widerspruchsrecht</strong></li>
            <li><strong>Recht auf Widerruf der Einwilligung</strong></li>
          </ul>
        </SubSection>
        <SubSection title="7.2. Ausübung der Rechte">
          <ul>
            <li>Per E-Mail: <a href="mailto:dpo@patyka.com" className="text-brand-600 hover:underline">dpo@patyka.com</a></li>
            <li>Per Post: PATYKA – 58 rue de Châteaudun – 75009 Paris – z.H. des DSB</li>
          </ul>
        </SubSection>
      </Section>

      <Section title="ARTIKEL 10. KONTAKT">
        <p className="font-semibold">Datenschutzbeauftragter (DSB) von PATYKA</p>
        <p>E-Mail: <a href="mailto:DPO@patyka.com" className="text-brand-600 hover:underline">DPO@patyka.com</a></p>
        <p>Postanschrift: PATYKA – 58 rue de Châteaudun – 75009 Paris</p>
      </Section>
    </div>
  ),
  es: (
    <div className="prose prose-sm max-w-none text-slate-700">
      <p className="text-base text-slate-600 mb-8">
        PATYKA otorga una importancia primordial a la protección de la privacidad y los datos personales de todas sus partes interesadas. La presente Política de Privacidad describe las normas que PATYKA aplica al recopilar, tratar, conservar y proteger información.
      </p>

      <Section title="ARTÍCULO 1. ÁMBITO DE APLICACIÓN Y DEFINICIONES">
        <SubSection title="1.2. Responsable del tratamiento">
          <p>PATYKA COSMETICS, sociedad por acciones simplificada con capital de 13.281 euros, inscrita en el Registro Mercantil de París con el número 791 258 874, con domicilio social en 58 rue de Châteaudun, 75009 París, Francia.</p>
          <p className="font-semibold mt-2">Delegado de Protección de Datos (DPD): <a href="mailto:dpo@patyka.com" className="text-brand-600 hover:underline">dpo@patyka.com</a></p>
        </SubSection>
      </Section>

      <Section title="ARTÍCULO 2. MARCO JURÍDICO Y PRINCIPIOS">
        <SubSection title="2.1. Textos aplicables">
          <ul>
            <li>Reglamento (UE) nº 2016/679 de 27 de abril de 2016 (RGPD)</li>
            <li>Ley francesa nº 78-17 de 6 de enero de 1978</li>
          </ul>
        </SubSection>
        <SubSection title="2.2. Principios fundamentales">
          <ul>
            <li><strong>Licitud, lealtad y transparencia</strong></li>
            <li><strong>Limitación de la finalidad</strong></li>
            <li><strong>Minimización de datos</strong></li>
            <li><strong>Exactitud</strong></li>
            <li><strong>Limitación del plazo de conservación</strong></li>
            <li><strong>Integridad y confidencialidad</strong></li>
            <li><strong>Responsabilidad proactiva</strong></li>
          </ul>
        </SubSection>
      </Section>

      <Section title="ARTÍCULO 3. DATOS RECOPILADOS Y FINALIDADES">
        <SubSection title="3.1. Actividades comerciales y relación con clientes">
          <DataTable
            headers={['Finalidad', 'Base jurídica', 'Plazo de conservación']}
            rows={[
              ['Gestión de pedidos', 'Ejecución del contrato de venta', '5 años tras el pedido'],
              ['Conservación de facturas', 'Obligación legal', '10 años'],
              ['Programa de fidelidad', 'Ejecución del contrato', 'Duración de la adhesión + 3 años'],
              ['Gestión de valoraciones', 'Interés legítimo', '3 años o retirada de la valoración'],
            ]}
          />
        </SubSection>
      </Section>

      <Section title="ARTÍCULO 4. SEGURIDAD Y PROTECCIÓN DE DATOS">
        <p>PATYKA aplica todas las medidas técnicas y organizativas apropiadas para garantizar un nivel de seguridad adecuado al riesgo, incluidas la seudonimización, el cifrado, la gestión del acceso y la formación del personal.</p>
      </Section>

      <Section title="ARTÍCULO 7. DERECHOS DE LOS INTERESADOS">
        <SubSection title="7.1. Lista de derechos">
          <ul>
            <li><strong>Derecho de acceso</strong></li>
            <li><strong>Derecho de rectificación</strong></li>
            <li><strong>Derecho de supresión</strong> («derecho al olvido»)</li>
            <li><strong>Derecho a la limitación del tratamiento</strong></li>
            <li><strong>Derecho a la portabilidad de los datos</strong></li>
            <li><strong>Derecho de oposición</strong></li>
            <li><strong>Derecho a retirar el consentimiento</strong></li>
          </ul>
        </SubSection>
        <SubSection title="7.2. Ejercicio de derechos">
          <ul>
            <li>Por correo electrónico: <a href="mailto:dpo@patyka.com" className="text-brand-600 hover:underline">dpo@patyka.com</a></li>
            <li>Por correo postal: PATYKA – 58 rue de Châteaudun – 75009 París – A la atención del DPD</li>
          </ul>
        </SubSection>
      </Section>

      <Section title="ARTÍCULO 10. CONTACTO">
        <p className="font-semibold">Delegado de Protección de Datos (DPD) de PATYKA</p>
        <p>Correo electrónico: <a href="mailto:DPO@patyka.com" className="text-brand-600 hover:underline">DPO@patyka.com</a></p>
        <p>Dirección postal: PATYKA – 58 rue de Châteaudun – 75009 París</p>
      </Section>
    </div>
  ),
  it: (
    <div className="prose prose-sm max-w-none text-slate-700">
      <p className="text-base text-slate-600 mb-8">
        PATYKA attribuisce un'importanza primaria alla protezione della privacy e dei dati personali di tutti i suoi stakeholder. La presente Informativa sulla Privacy descrive le regole che PATYKA applica quando raccoglie, tratta, conserva e protegge informazioni.
      </p>

      <Section title="ARTICOLO 1. AMBITO DI APPLICAZIONE E DEFINIZIONI">
        <SubSection title="1.2. Titolare del trattamento">
          <p>PATYKA COSMETICS, società per azioni semplificata con capitale di 13.281 euro, iscritta al Registro del Commercio e delle Società di Parigi con il numero 791 258 874, con sede legale al 58 rue de Châteaudun, 75009 Parigi, Francia.</p>
          <p className="font-semibold mt-2">Responsabile della Protezione dei Dati (RPD): <a href="mailto:dpo@patyka.com" className="text-brand-600 hover:underline">dpo@patyka.com</a></p>
        </SubSection>
      </Section>

      <Section title="ARTICOLO 2. QUADRO GIURIDICO E PRINCIPI">
        <SubSection title="2.1. Testi applicabili">
          <ul>
            <li>Regolamento (UE) n. 2016/679 del 27 aprile 2016 (GDPR)</li>
            <li>Legge francese n. 78-17 del 6 gennaio 1978</li>
          </ul>
        </SubSection>
        <SubSection title="2.2. Principi fondamentali">
          <ul>
            <li><strong>Liceità, correttezza e trasparenza</strong></li>
            <li><strong>Limitazione della finalità</strong></li>
            <li><strong>Minimizzazione dei dati</strong></li>
            <li><strong>Esattezza</strong></li>
            <li><strong>Limitazione della conservazione</strong></li>
            <li><strong>Integrità e riservatezza</strong></li>
            <li><strong>Responsabilizzazione</strong></li>
          </ul>
        </SubSection>
      </Section>

      <Section title="ARTICOLO 3. DATI RACCOLTI E FINALITÀ DEI TRATTAMENTI">
        <SubSection title="3.1. Attività commerciali e relazione con i clienti">
          <DataTable
            headers={['Finalità', 'Base giuridica', 'Durata di conservazione']}
            rows={[
              ['Gestione degli ordini', 'Esecuzione del contratto di vendita', '5 anni dopo l\'ordine'],
              ['Conservazione delle fatture', 'Obbligo legale', '10 anni'],
              ['Programma fedeltà', 'Esecuzione del contratto', 'Durata dell\'adesione + 3 anni'],
              ['Gestione delle recensioni', 'Interesse legittimo', '3 anni o ritiro della recensione'],
            ]}
          />
        </SubSection>
      </Section>

      <Section title="ARTICOLO 4. SICUREZZA E PROTEZIONE DEI DATI">
        <p>PATYKA adotta tutte le misure tecniche e organizzative appropriate per garantire un livello di sicurezza adeguato al rischio, tra cui pseudonimizzazione, crittografia, gestione degli accessi e formazione del personale.</p>
      </Section>

      <Section title="ARTICOLO 7. DIRITTI DEGLI INTERESSATI">
        <SubSection title="7.1. Elenco dei diritti">
          <ul>
            <li><strong>Diritto di accesso</strong></li>
            <li><strong>Diritto di rettifica</strong></li>
            <li><strong>Diritto alla cancellazione</strong> («diritto all'oblio»)</li>
            <li><strong>Diritto alla limitazione del trattamento</strong></li>
            <li><strong>Diritto alla portabilità dei dati</strong></li>
            <li><strong>Diritto di opposizione</strong></li>
            <li><strong>Diritto di revocare il consenso</strong></li>
          </ul>
        </SubSection>
        <SubSection title="7.2. Modalità di esercizio dei diritti">
          <ul>
            <li>Per e-mail: <a href="mailto:dpo@patyka.com" className="text-brand-600 hover:underline">dpo@patyka.com</a></li>
            <li>Per posta: PATYKA – 58 rue de Châteaudun – 75009 Parigi – All'attenzione del RPD</li>
          </ul>
        </SubSection>
      </Section>

      <Section title="ARTICOLO 10. CONTATTO">
        <p className="font-semibold">Responsabile della Protezione dei Dati (RPD) di PATYKA</p>
        <p>E-mail: <a href="mailto:DPO@patyka.com" className="text-brand-600 hover:underline">DPO@patyka.com</a></p>
        <p>Indirizzo postale: PATYKA – 58 rue de Châteaudun – 75009 Parigi</p>
      </Section>
    </div>
  ),
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-brand-700 border-b border-brand-100 pb-2 mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-brand-600 mb-2">{title}</h3>
      <div className="text-sm space-y-2">{children}</div>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto mt-3 mb-3">
      <table className="min-w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-brand-50">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold text-brand-700 border-b border-brand-100">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-slate-700 border-b border-slate-100">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PrivacyPolicy() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language?.split('-')[0] || 'fr';
  const content = privacyContent[lang] || privacyContent['fr'];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">{t('common.back')}</span>
          </button>
          <div className="flex items-center gap-2 ml-2">
            <Shield className="w-5 h-5 text-brand-600" />
            <h1 className="text-lg font-semibold text-slate-900">{t('privacy.title')}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-10 text-white">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-8 h-8 opacity-90" />
              <span className="text-2xl font-bold tracking-tight">PATYKA</span>
            </div>
            <h2 className="text-xl font-semibold mb-1">{t('privacy.title')}</h2>
            <p className="text-blue-100 text-sm">{t('privacy.subtitle')}</p>
            <p className="text-blue-200 text-xs mt-3">{t('privacy.lastUpdated')}</p>
          </div>

          <div className="px-8 py-8">
            {content}
          </div>

          <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">{t('privacy.lastUpdated')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
