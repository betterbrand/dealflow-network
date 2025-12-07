/**
 * Sample data generation script
 * Creates realistic LinkedIn-style profiles to showcase all features
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

// Get the owner user ID (should be user ID 1)
const OWNER_USER_ID = 1;

// Sample companies with realistic data
const companies = [
  {
    name: 'OpenAI',
    type: 'Technology',
    description: 'AI research and deployment company',
    industry: 'Artificial Intelligence',
    location: 'San Francisco, CA',
    website: 'https://openai.com',
    size: '500-1000',
    foundedYear: 2015,
    linkedinUrl: 'https://www.linkedin.com/company/openai',
    employeeCount: 750,
    fundingStage: 'Series C',
    totalFunding: '$11.3B',
    tags: JSON.stringify(['AI', 'Machine Learning', 'Research'])
  },
  {
    name: 'Anthropic',
    type: 'Technology',
    description: 'AI safety and research company',
    industry: 'Artificial Intelligence',
    location: 'San Francisco, CA',
    website: 'https://anthropic.com',
    size: '100-500',
    foundedYear: 2021,
    linkedinUrl: 'https://www.linkedin.com/company/anthropic',
    employeeCount: 200,
    fundingStage: 'Series C',
    totalFunding: '$7.3B',
    tags: JSON.stringify(['AI Safety', 'LLM', 'Research'])
  },
  {
    name: 'Microsoft',
    type: 'Technology',
    description: 'Global technology company',
    industry: 'Software',
    location: 'Redmond, WA',
    website: 'https://microsoft.com',
    size: '10000+',
    foundedYear: 1975,
    linkedinUrl: 'https://www.linkedin.com/company/microsoft',
    employeeCount: 221000,
    fundingStage: 'Public',
    totalFunding: 'Public Company',
    tags: JSON.stringify(['Cloud', 'Software', 'Enterprise'])
  },
  {
    name: 'Y Combinator',
    type: 'Venture Capital',
    description: 'Startup accelerator and venture capital firm',
    industry: 'Venture Capital',
    location: 'Mountain View, CA',
    website: 'https://ycombinator.com',
    size: '100-500',
    foundedYear: 2005,
    linkedinUrl: 'https://www.linkedin.com/company/y-combinator',
    employeeCount: 150,
    fundingStage: 'N/A',
    totalFunding: 'N/A',
    tags: JSON.stringify(['Startups', 'Accelerator', 'Venture Capital'])
  },
  {
    name: 'Sequoia Capital',
    type: 'Venture Capital',
    description: 'Venture capital firm',
    industry: 'Venture Capital',
    location: 'Menlo Park, CA',
    website: 'https://sequoiacap.com',
    size: '100-500',
    foundedYear: 1972,
    linkedinUrl: 'https://www.linkedin.com/company/sequoia-capital',
    employeeCount: 200,
    fundingStage: 'N/A',
    totalFunding: 'N/A',
    tags: JSON.stringify(['Venture Capital', 'Growth Equity'])
  },
  {
    name: 'Stripe',
    type: 'Technology',
    description: 'Payment processing platform',
    industry: 'Fintech',
    location: 'San Francisco, CA',
    website: 'https://stripe.com',
    size: '5000-10000',
    foundedYear: 2010,
    linkedinUrl: 'https://www.linkedin.com/company/stripe',
    employeeCount: 8000,
    fundingStage: 'Series I',
    totalFunding: '$2.2B',
    tags: JSON.stringify(['Payments', 'Fintech', 'API'])
  }
];

// Sample events
const events = [
  {
    name: 'AI Summit 2024',
    date: new Date('2024-03-15'),
    location: 'San Francisco, CA',
    type: 'Conference',
    description: 'Annual AI and machine learning conference'
  },
  {
    name: 'YC Demo Day W24',
    date: new Date('2024-04-02'),
    location: 'Mountain View, CA',
    type: 'Demo Day',
    description: 'Y Combinator Winter 2024 batch demo day'
  },
  {
    name: 'TechCrunch Disrupt',
    date: new Date('2024-09-18'),
    location: 'San Francisco, CA',
    type: 'Conference',
    description: 'Startup and technology conference'
  }
];

// Sample contacts with realistic LinkedIn-style data
const contacts = [
  {
    name: 'Sam Altman',
    company: 'OpenAI',
    role: 'CEO',
    location: 'San Francisco, CA',
    email: 'sam@openai.com',
    linkedinUrl: 'https://www.linkedin.com/in/sam-altman',
    twitterUrl: 'https://twitter.com/sama',
    summary: 'CEO of OpenAI. Former president of Y Combinator. Focused on building safe AGI that benefits humanity.',
    experience: JSON.stringify([
      { company: 'OpenAI', role: 'CEO', years: '2019-Present' },
      { company: 'Y Combinator', role: 'President', years: '2014-2019' },
      { company: 'Loopt', role: 'Co-founder & CEO', years: '2005-2012' }
    ]),
    education: JSON.stringify([
      { school: 'Stanford University', degree: 'Computer Science (dropped out)', years: '2003-2005' }
    ]),
    skills: JSON.stringify(['Leadership', 'AI Strategy', 'Venture Capital', 'Product Development']),
    sentiment: 'positive',
    interestLevel: 'high',
    notes: 'Met at AI Summit 2024. Very interested in AI safety and alignment.',
    eventId: 1
  },
  {
    name: 'Dario Amodei',
    company: 'Anthropic',
    role: 'CEO & Co-founder',
    location: 'San Francisco, CA',
    email: 'dario@anthropic.com',
    linkedinUrl: 'https://www.linkedin.com/in/dario-amodei',
    summary: 'CEO of Anthropic. Former VP of Research at OpenAI. PhD in computational neuroscience. Building safe, steerable AI systems.',
    experience: JSON.stringify([
      { company: 'Anthropic', role: 'CEO & Co-founder', years: '2021-Present' },
      { company: 'OpenAI', role: 'VP of Research', years: '2016-2021' },
      { company: 'Baidu', role: 'Research Scientist', years: '2015-2016' }
    ]),
    education: JSON.stringify([
      { school: 'Princeton University', degree: 'PhD in Computational Neuroscience', years: '2010-2016' },
      { school: 'Stanford University', degree: 'BS in Physics', years: '2006-2010' }
    ]),
    skills: JSON.stringify(['AI Research', 'Machine Learning', 'AI Safety', 'Leadership']),
    sentiment: 'positive',
    interestLevel: 'high',
    notes: 'Deep technical expertise in AI safety. Great conversation about constitutional AI.',
    eventId: 1
  },
  {
    name: 'Satya Nadella',
    company: 'Microsoft',
    role: 'Chairman & CEO',
    location: 'Redmond, WA',
    email: 'satya@microsoft.com',
    linkedinUrl: 'https://www.linkedin.com/in/satyanadella',
    summary: 'Chairman and CEO of Microsoft. Leading Microsoft\'s transformation to cloud-first, AI-first company.',
    experience: JSON.stringify([
      { company: 'Microsoft', role: 'Chairman & CEO', years: '2014-Present' },
      { company: 'Microsoft', role: 'Executive VP, Cloud and Enterprise', years: '2011-2014' },
      { company: 'Microsoft', role: 'Senior VP, R&D', years: '2009-2011' }
    ]),
    education: JSON.stringify([
      { school: 'University of Chicago', degree: 'MBA', years: '1996-1997' },
      { school: 'University of Wisconsin-Milwaukee', degree: 'MS in Computer Science', years: '1988-1990' },
      { school: 'Manipal Institute of Technology', degree: 'BE in Electrical Engineering', years: '1984-1988' }
    ]),
    skills: JSON.stringify(['Leadership', 'Cloud Computing', 'AI Strategy', 'Enterprise Software']),
    sentiment: 'positive',
    interestLevel: 'medium',
    notes: 'Brief conversation about Microsoft\'s AI investments.',
    eventId: 1
  },
  {
    name: 'Garry Tan',
    company: 'Y Combinator',
    role: 'President & CEO',
    location: 'San Francisco, CA',
    email: 'garry@ycombinator.com',
    linkedinUrl: 'https://www.linkedin.com/in/garrytann',
    twitterUrl: 'https://twitter.com/garrytan',
    summary: 'President & CEO of Y Combinator. Former partner at YC. Co-founder of Initialized Capital.',
    experience: JSON.stringify([
      { company: 'Y Combinator', role: 'President & CEO', years: '2023-Present' },
      { company: 'Initialized Capital', role: 'Managing Partner', years: '2012-2023' },
      { company: 'Y Combinator', role: 'Partner', years: '2010-2012' },
      { company: 'Posterous', role: 'Co-founder', years: '2008-2012' }
    ]),
    education: JSON.stringify([
      { school: 'Stanford University', degree: 'BS in Computer Science', years: '2003-2007' }
    ]),
    skills: JSON.stringify(['Venture Capital', 'Startups', 'Product Design', 'Leadership']),
    sentiment: 'positive',
    interestLevel: 'high',
    notes: 'Great insights on early-stage startups. Interested in AI applications.',
    eventId: 2
  },
  {
    name: 'Patrick Collison',
    company: 'Stripe',
    role: 'Co-founder & CEO',
    location: 'San Francisco, CA',
    email: 'patrick@stripe.com',
    linkedinUrl: 'https://www.linkedin.com/in/patrickcollison',
    twitterUrl: 'https://twitter.com/patrickc',
    summary: 'Co-founder and CEO of Stripe. Building economic infrastructure for the internet.',
    experience: JSON.stringify([
      { company: 'Stripe', role: 'Co-founder & CEO', years: '2010-Present' },
      { company: 'Auctomatic', role: 'Co-founder', years: '2007-2008' }
    ]),
    education: JSON.stringify([
      { school: 'MIT', degree: 'Physics (dropped out)', years: '2009-2010' }
    ]),
    skills: JSON.stringify(['Payments', 'Product Development', 'Leadership', 'Engineering']),
    sentiment: 'positive',
    interestLevel: 'high',
    notes: 'Discussed payment infrastructure and API design.',
    eventId: 3
  },
  {
    name: 'Andrej Karpathy',
    company: 'OpenAI',
    role: 'Founding Member',
    location: 'San Francisco, CA',
    email: 'andrej@openai.com',
    linkedinUrl: 'https://www.linkedin.com/in/andrej-karpathy',
    twitterUrl: 'https://twitter.com/karpathy',
    summary: 'AI researcher and educator. Former Director of AI at Tesla. Founding member of OpenAI.',
    experience: JSON.stringify([
      { company: 'OpenAI', role: 'Founding Member', years: '2023-Present' },
      { company: 'Tesla', role: 'Director of AI', years: '2017-2022' },
      { company: 'OpenAI', role: 'Research Scientist', years: '2015-2017' }
    ]),
    education: JSON.stringify([
      { school: 'Stanford University', degree: 'PhD in Computer Science', years: '2011-2015' },
      { school: 'University of Toronto', degree: 'BS in Computer Science', years: '2005-2009' }
    ]),
    skills: JSON.stringify(['Deep Learning', 'Computer Vision', 'Neural Networks', 'Teaching']),
    sentiment: 'positive',
    interestLevel: 'high',
    notes: 'Amazing technical depth. Great educator and communicator.',
    eventId: 1
  },
  {
    name: 'Ilya Sutskever',
    company: 'OpenAI',
    role: 'Co-founder & Chief Scientist',
    location: 'San Francisco, CA',
    email: 'ilya@openai.com',
    linkedinUrl: 'https://www.linkedin.com/in/ilya-sutskever',
    summary: 'Co-founder and Chief Scientist at OpenAI. Pioneer in deep learning and neural networks.',
    experience: JSON.stringify([
      { company: 'OpenAI', role: 'Co-founder & Chief Scientist', years: '2015-Present' },
      { company: 'Google Brain', role: 'Research Scientist', years: '2012-2015' }
    ]),
    education: JSON.stringify([
      { school: 'University of Toronto', degree: 'PhD in Computer Science', years: '2008-2013' },
      { school: 'University of Toronto', degree: 'BS in Mathematics', years: '2003-2007' }
    ]),
    skills: JSON.stringify(['Deep Learning', 'AI Research', 'Neural Networks', 'Machine Learning']),
    sentiment: 'positive',
    interestLevel: 'high',
    notes: 'Deep technical conversation about transformer architectures.',
    eventId: 1
  },
  {
    name: 'Daniela Amodei',
    company: 'Anthropic',
    role: 'President & Co-founder',
    location: 'San Francisco, CA',
    email: 'daniela@anthropic.com',
    linkedinUrl: 'https://www.linkedin.com/in/daniela-amodei',
    summary: 'President and Co-founder of Anthropic. Former VP of Operations at OpenAI.',
    experience: JSON.stringify([
      { company: 'Anthropic', role: 'President & Co-founder', years: '2021-Present' },
      { company: 'OpenAI', role: 'VP of Operations', years: '2016-2021' },
      { company: 'Stripe', role: 'Senior Manager', years: '2014-2016' }
    ]),
    education: JSON.stringify([
      { school: 'Harvard University', degree: 'BA in Economics', years: '2006-2010' }
    ]),
    skills: JSON.stringify(['Operations', 'Leadership', 'Strategy', 'Team Building']),
    sentiment: 'positive',
    interestLevel: 'medium',
    notes: 'Discussed scaling AI companies and operational challenges.',
    eventId: 1
  },
  {
    name: 'Roelof Botha',
    company: 'Sequoia Capital',
    role: 'Senior Steward & Partner',
    location: 'Menlo Park, CA',
    email: 'roelof@sequoiacap.com',
    linkedinUrl: 'https://www.linkedin.com/in/roelofbotha',
    summary: 'Senior Steward at Sequoia Capital. Former CFO of PayPal. Board member at several leading tech companies.',
    experience: JSON.stringify([
      { company: 'Sequoia Capital', role: 'Senior Steward & Partner', years: '2003-Present' },
      { company: 'PayPal', role: 'CFO', years: '2001-2003' }
    ]),
    education: JSON.stringify([
      { school: 'Stanford University', degree: 'MBA', years: '1998-2000' },
      { school: 'University of Cape Town', degree: 'Bachelor of Commerce', years: '1992-1995' }
    ]),
    skills: JSON.stringify(['Venture Capital', 'Finance', 'Board Governance', 'Strategy']),
    sentiment: 'positive',
    interestLevel: 'medium',
    notes: 'Insightful perspective on venture capital and company building.',
    eventId: 2
  },
  {
    name: 'John Collison',
    company: 'Stripe',
    role: 'Co-founder & President',
    location: 'San Francisco, CA',
    email: 'john@stripe.com',
    linkedinUrl: 'https://www.linkedin.com/in/john-collison',
    twitterUrl: 'https://twitter.com/collision',
    summary: 'Co-founder and President of Stripe. Building tools to increase the GDP of the internet.',
    experience: JSON.stringify([
      { company: 'Stripe', role: 'Co-founder & President', years: '2010-Present' },
      { company: 'Auctomatic', role: 'Co-founder', years: '2007-2008' }
    ]),
    education: JSON.stringify([
      { school: 'Harvard University', degree: 'Physics (dropped out)', years: '2009-2010' }
    ]),
    skills: JSON.stringify(['Product Development', 'Engineering', 'Payments', 'Leadership']),
    sentiment: 'positive',
    interestLevel: 'high',
    notes: 'Discussed developer tools and API design philosophy.',
    eventId: 3
  },
  {
    name: 'Greg Brockman',
    company: 'OpenAI',
    role: 'Co-founder & President',
    location: 'San Francisco, CA',
    email: 'greg@openai.com',
    linkedinUrl: 'https://www.linkedin.com/in/thegdb',
    twitterUrl: 'https://twitter.com/gdb',
    summary: 'Co-founder and President of OpenAI. Former CTO of Stripe.',
    experience: JSON.stringify([
      { company: 'OpenAI', role: 'Co-founder & President', years: '2015-Present' },
      { company: 'Stripe', role: 'CTO', years: '2010-2015' }
    ]),
    education: JSON.stringify([
      { school: 'MIT', degree: 'Mathematics & Computer Science (dropped out)', years: '2008-2010' }
    ]),
    skills: JSON.stringify(['Engineering', 'Leadership', 'AI', 'Product Development']),
    sentiment: 'positive',
    interestLevel: 'high',
    notes: 'Technical discussion about AI safety and alignment.',
    eventId: 1
  },
  {
    name: 'Mira Murati',
    company: 'OpenAI',
    role: 'CTO',
    location: 'San Francisco, CA',
    email: 'mira@openai.com',
    linkedinUrl: 'https://www.linkedin.com/in/mira-murati',
    summary: 'Chief Technology Officer at OpenAI. Leading product and engineering teams.',
    experience: JSON.stringify([
      { company: 'OpenAI', role: 'CTO', years: '2022-Present' },
      { company: 'OpenAI', role: 'VP of Research, Product & Partnerships', years: '2018-2022' },
      { company: 'Tesla', role: 'Senior Product Manager', years: '2016-2018' },
      { company: 'Leap Motion', role: 'Product Lead', years: '2013-2016' }
    ]),
    education: JSON.stringify([
      { school: 'Dartmouth College', degree: 'BE in Mechanical Engineering', years: '2008-2012' }
    ]),
    skills: JSON.stringify(['Product Management', 'AI', 'Engineering', 'Leadership']),
    sentiment: 'positive',
    interestLevel: 'high',
    notes: 'Discussed product strategy and AI deployment.',
    eventId: 1
  },
  {
    name: 'Chris Lattner',
    company: 'Anthropic',
    role: 'Engineering Lead',
    location: 'San Francisco, CA',
    email: 'chris@anthropic.com',
    linkedinUrl: 'https://www.linkedin.com/in/chrislattner',
    twitterUrl: 'https://twitter.com/clattner_llvm',
    summary: 'Engineering leader at Anthropic. Creator of Swift and LLVM. Former VP at Tesla and Google.',
    experience: JSON.stringify([
      { company: 'Anthropic', role: 'Engineering Lead', years: '2023-Present' },
      { company: 'SiFive', role: 'CEO', years: '2022-2023' },
      { company: 'Google', role: 'VP, Platform', years: '2021-2022' },
      { company: 'Tesla', role: 'VP of Autopilot Software', years: '2017-2021' },
      { company: 'Apple', role: 'Director of Developer Tools', years: '2005-2017' }
    ]),
    education: JSON.stringify([
      { school: 'University of Illinois', degree: 'PhD in Computer Science', years: '2000-2005' },
      { school: 'University of Portland', degree: 'BS in Computer Science', years: '1996-2000' }
    ]),
    skills: JSON.stringify(['Compilers', 'Programming Languages', 'Engineering Leadership', 'AI Infrastructure']),
    sentiment: 'positive',
    interestLevel: 'high',
    notes: 'Deep technical expertise. Discussed AI infrastructure and tooling.',
    eventId: 1
  },
  {
    name: 'Michael Seibel',
    company: 'Y Combinator',
    role: 'Managing Director & Group Partner',
    location: 'San Francisco, CA',
    email: 'michael@ycombinator.com',
    linkedinUrl: 'https://www.linkedin.com/in/michaelseibel',
    twitterUrl: 'https://twitter.com/mwseibel',
    summary: 'Managing Director at Y Combinator. Co-founder of Justin.tv and Socialcam.',
    experience: JSON.stringify([
      { company: 'Y Combinator', role: 'Managing Director & Group Partner', years: '2014-Present' },
      { company: 'Socialcam', role: 'Co-founder & CEO', years: '2011-2012' },
      { company: 'Justin.tv', role: 'Co-founder & CEO', years: '2007-2011' }
    ]),
    education: JSON.stringify([
      { school: 'Yale University', degree: 'BA in Political Science', years: '2001-2005' }
    ]),
    skills: JSON.stringify(['Startups', 'Product Development', 'Leadership', 'Mentorship']),
    sentiment: 'positive',
    interestLevel: 'medium',
    notes: 'Great advice on early-stage product development.',
    eventId: 2
  },
  {
    name: 'Emmett Shear',
    company: 'Y Combinator',
    role: 'Partner',
    location: 'San Francisco, CA',
    email: 'emmett@ycombinator.com',
    linkedinUrl: 'https://www.linkedin.com/in/emmettshear',
    twitterUrl: 'https://twitter.com/eshear',
    summary: 'Partner at Y Combinator. Co-founder and former CEO of Twitch. Brief interim CEO of OpenAI.',
    experience: JSON.stringify([
      { company: 'Y Combinator', role: 'Partner', years: '2023-Present' },
      { company: 'OpenAI', role: 'Interim CEO', years: 'Nov 2023' },
      { company: 'Twitch', role: 'Co-founder & CEO', years: '2011-2023' },
      { company: 'Justin.tv', role: 'Co-founder', years: '2007-2011' }
    ]),
    education: JSON.stringify([
      { school: 'Yale University', degree: 'BS in Computer Science', years: '2001-2005' }
    ]),
    skills: JSON.stringify(['Product Development', 'Leadership', 'Live Streaming', 'Community Building']),
    sentiment: 'positive',
    interestLevel: 'medium',
    notes: 'Interesting perspective on building community-driven products.',
    eventId: 2
  },
  {
    name: 'Elad Gil',
    company: 'Color Genomics',
    role: 'Co-founder & Chairman',
    location: 'San Francisco, CA',
    email: 'elad@color.com',
    linkedinUrl: 'https://www.linkedin.com/in/eladgil',
    twitterUrl: 'https://twitter.com/eladgil',
    summary: 'Entrepreneur, investor, and advisor. Co-founder of Color. Former VP at Twitter.',
    experience: JSON.stringify([
      { company: 'Color Genomics', role: 'Co-founder & Chairman', years: '2013-Present' },
      { company: 'Twitter', role: 'VP of Corporate Strategy', years: '2011-2013' },
      { company: 'Google', role: 'Product Manager', years: '2004-2011' }
    ]),
    education: JSON.stringify([
      { school: 'MIT', degree: 'PhD in Biology', years: '2000-2004' },
      { school: 'MIT', degree: 'BS in Mathematics', years: '1996-2000' }
    ]),
    skills: JSON.stringify(['Strategy', 'Product Management', 'Venture Capital', 'Biotechnology']),
    sentiment: 'positive',
    interestLevel: 'medium',
    notes: 'Insightful on scaling companies and strategic thinking.',
    eventId: 3
  }
];

async function seed() {
  console.log('[Seed] Starting sample data generation...');
  
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Insert companies
    console.log('[Seed] Inserting companies...');
    const companyIds = {};
    
    for (const company of companies) {
      const [result] = await connection.query(
        `INSERT INTO companies (name, type, description, industry, location, website, size, foundedYear, linkedinUrl, employeeCount, fundingStage, totalFunding, tags, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [company.name, company.type, company.description, company.industry, company.location, company.website, company.size, company.foundedYear, company.linkedinUrl, company.employeeCount, company.fundingStage, company.totalFunding, company.tags]
      );
      companyIds[company.name] = result.insertId;
    }
    
    console.log(`[Seed] Inserted ${companies.length} companies`);
    
    // Insert events
    console.log('[Seed] Inserting events...');
    const eventIds = {};
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const [result] = await connection.query(
        `INSERT INTO events (name, date, location, type, description, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [event.name, event.date, event.location, event.type, event.description]
      );
      eventIds[i + 1] = result.insertId;
    }
    
    console.log(`[Seed] Inserted ${events.length} events`);
    
    // Insert contacts
    console.log('[Seed] Inserting contacts...');
    const contactIds = [];
    
    for (const contact of contacts) {
      const companyId = companyIds[contact.company] || null;
      const eventId = contact.eventId ? eventIds[contact.eventId] : null;
      
      // Insert into contacts table (shared data only)
      const [result] = await connection.query(
        `INSERT INTO contacts (name, company, role, location, email, linkedinUrl, twitterUrl, summary, experience, education, skills, companyId, createdBy, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [contact.name, contact.company, contact.role, contact.location, contact.email, contact.linkedinUrl, contact.twitterUrl, contact.summary, contact.experience, contact.education, contact.skills, companyId, OWNER_USER_ID]
      );
      const contactId = result.insertId;
      
      // Insert into userContacts table (user-specific data)
      await connection.query(
        `INSERT INTO userContacts (userId, contactId, privateNotes, sentiment, interestLevel, eventId, addedAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [OWNER_USER_ID, contactId, contact.notes, contact.sentiment, contact.interestLevel, eventId]
      );
      
      contactIds.push({ id: contactId, name: contact.name, company: contact.company });
    }
    
    console.log(`[Seed] Inserted ${contacts.length} contacts`);
    
    // Create relationships for knowledge graph
    console.log('[Seed] Creating contact relationships...');
    
    const relationships = [
      // OpenAI team
      { from: 'Sam Altman', to: 'Ilya Sutskever', type: 'co-founder', strength: 10 },
      { from: 'Sam Altman', to: 'Greg Brockman', type: 'co-founder', strength: 10 },
      { from: 'Sam Altman', to: 'Mira Murati', type: 'works_with', strength: 9 },
      { from: 'Sam Altman', to: 'Andrej Karpathy', type: 'works_with', strength: 8 },
      { from: 'Ilya Sutskever', to: 'Greg Brockman', type: 'co-founder', strength: 10 },
      { from: 'Ilya Sutskever', to: 'Andrej Karpathy', type: 'colleague', strength: 9 },
      { from: 'Greg Brockman', to: 'Mira Murati', type: 'works_with', strength: 9 },
      
      // Anthropic team
      { from: 'Dario Amodei', to: 'Daniela Amodei', type: 'co-founder', strength: 10 },
      { from: 'Dario Amodei', to: 'Chris Lattner', type: 'works_with', strength: 8 },
      { from: 'Daniela Amodei', to: 'Chris Lattner', type: 'works_with', strength: 7 },
      
      // OpenAI <-> Anthropic connections
      { from: 'Dario Amodei', to: 'Sam Altman', type: 'former_colleague', strength: 7 },
      { from: 'Dario Amodei', to: 'Ilya Sutskever', type: 'former_colleague', strength: 8 },
      { from: 'Daniela Amodei', to: 'Sam Altman', type: 'former_colleague', strength: 7 },
      
      // Stripe connections
      { from: 'Patrick Collison', to: 'John Collison', type: 'co-founder', strength: 10 },
      { from: 'Greg Brockman', to: 'Patrick Collison', type: 'former_colleague', strength: 8 },
      { from: 'Greg Brockman', to: 'John Collison', type: 'former_colleague', strength: 8 },
      
      // YC connections
      { from: 'Garry Tan', to: 'Michael Seibel', type: 'colleague', strength: 9 },
      { from: 'Garry Tan', to: 'Emmett Shear', type: 'colleague', strength: 8 },
      { from: 'Michael Seibel', to: 'Emmett Shear', type: 'co-founder', strength: 10 },
      { from: 'Sam Altman', to: 'Garry Tan', type: 'former_colleague', strength: 8 },
      
      // Cross-company connections
      { from: 'Andrej Karpathy', to: 'Satya Nadella', type: 'met_at_event', strength: 5 },
      { from: 'Sam Altman', to: 'Satya Nadella', type: 'business_partner', strength: 7 },
      { from: 'Roelof Botha', to: 'Patrick Collison', type: 'investor', strength: 8 },
      { from: 'Elad Gil', to: 'Sam Altman', type: 'advisor', strength: 7 },
      { from: 'Elad Gil', to: 'Dario Amodei', type: 'investor', strength: 7 },
    ];
    
    for (const rel of relationships) {
      const fromContact = contactIds.find(c => c.name === rel.from);
      const toContact = contactIds.find(c => c.name === rel.to);
      
      if (fromContact && toContact) {
        await connection.query(
          `INSERT INTO contactRelationships (fromContactId, toContactId, relationshipType, strength, createdAt)
           VALUES (?, ?, ?, ?, NOW())`,
          [fromContact.id, toContact.id, rel.type, rel.strength]
        );
      }
    }
    
    console.log(`[Seed] Created ${relationships.length} relationships`);
    
    console.log('[Seed] ✅ Sample data generation completed successfully!');
    console.log(`[Seed] Summary:`);
    console.log(`  - ${companies.length} companies`);
    console.log(`  - ${events.length} events`);
    console.log(`  - ${contacts.length} contacts`);
    console.log(`  - ${relationships.length} relationships`);
    
  } catch (error) {
    console.error('[Seed] ❌ Seed failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seed().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
