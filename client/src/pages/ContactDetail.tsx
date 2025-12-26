import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, MapPin, Building2, Calendar, User, Linkedin, Twitter, Plus, ExternalLink, Briefcase, GraduationCap, FileText, Users, Download, RefreshCw, Loader2, CheckCircle, XCircle, Lightbulb, Trash2, Database, ChevronDown, ChevronUp } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link, useParams, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { AddRelationshipDialog } from "@/components/AddRelationshipDialog";
import { EditContactDialog } from "@/components/EditContactDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function ContactDetail() {
  const params = useParams();
  const contactId = params.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const [showAddRelationshipDialog, setShowAddRelationshipDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [importStep, setImportStep] = useState<'provider' | 'loading' | 'preview' | 'success'>('provider');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'scrapingdog' | 'brightdata'>('scrapingdog');
  const [previewData, setPreviewData] = useState<any>(null);
  const [importCompany, setImportCompany] = useState(false);
  const [showSemanticData, setShowSemanticData] = useState(false);

  const utils = trpc.useUtils();
  const { data: contact, isLoading, refetch } = trpc.contacts.get.useQuery({ id: contactId });
  const { data: relationships, refetch: refetchRelationships } = trpc.relationships.getForContact.useQuery({ contactId });
  const { data: availableProviders } = trpc.contacts.getAvailableProviders.useQuery();
  const { data: semanticData } = trpc.semanticGraph.getContactTriples.useQuery(
    { contactId },
    { enabled: showSemanticData && contactId > 0 }
  );

  const getImportPreviewMutation = trpc.contacts.getImportPreview.useMutation();
  const confirmImportMutation = trpc.contacts.confirmImport.useMutation();
  const deleteContactMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate();
      utils.contacts.search.invalidate();
      setLocation("/contacts");
    },
  });

  // Parse JSON fields
  const experience = contact?.experience ? JSON.parse(contact.experience) : [];
  const education = contact?.education ? JSON.parse(contact.education) : [];
  const skills = contact?.skills ? JSON.parse(contact.skills) : [];
  const bioLinks = contact?.bioLinks ? JSON.parse(contact.bioLinks) : [];
  const posts = contact?.posts ? JSON.parse(contact.posts) : [];
  const activity = contact?.activity ? JSON.parse(contact.activity) : [];
  const peopleAlsoViewed = contact?.peopleAlsoViewed ? JSON.parse(contact.peopleAlsoViewed) : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/contacts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Contacts
            </Button>
          </Link>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          Loading contact details...
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/contacts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Contacts
            </Button>
          </Link>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          Contact not found
        </div>
      </div>
    );
  }

  const handleRelationshipSuccess = () => {
    refetchRelationships();
    refetch();
  };

  const handleOpenImportDialog = () => {
    // Pre-fill LinkedIn URL if available
    setLinkedinUrl(contact?.linkedinUrl || '');
    setImportStep('provider');
    setPreviewData(null);
    setImportCompany(false);
    setShowImportDialog(true);
  };

  const handleFetchPreview = async () => {
    if (!linkedinUrl.trim()) return;

    setImportStep('loading');
    try {
      const result = await getImportPreviewMutation.mutateAsync({
        linkedinUrl: linkedinUrl.trim(),
        provider: selectedProvider,
      });
      setPreviewData(result);
      setImportStep('preview');
    } catch (error) {
      console.error('Failed to fetch preview:', error);
      setImportStep('provider');
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;

    setImportStep('loading');
    try {
      await confirmImportMutation.mutateAsync({
        contactId,
        importData: previewData._rawData,
        importCompany,
        provider: selectedProvider,
        linkedinUrl: linkedinUrl.trim(),
      });
      setImportStep('success');
      refetch();
    } catch (error) {
      console.error('Failed to confirm import:', error);
      setImportStep('preview');
    }
  };

  const handleCloseImportDialog = () => {
    setShowImportDialog(false);
    setImportStep('provider');
    setPreviewData(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/contacts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {/* Import Status Badge */}
          {contact.importStatus === 'pending' && (
            <Badge variant="outline" className="text-muted-foreground">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Import in progress...
            </Badge>
          )}
          {contact.importStatus === 'complete' && contact.lastImportedAt && (
            <Badge variant="secondary">
              <CheckCircle className="mr-1 h-3 w-3" />
              Imported {new Date(contact.lastImportedAt).toLocaleDateString()}
            </Badge>
          )}
          {contact.importStatus === 'failed' && (
            <Badge variant="destructive">
              <XCircle className="mr-1 h-3 w-3" />
              Import failed
            </Badge>
          )}

          {/* Import Button */}
          {contact.linkedinUrl && contact.importStatus !== 'complete' && (
            <Button onClick={handleOpenImportDialog}>
              <Download className="mr-2 h-4 w-4" />
              Import from LinkedIn
            </Button>
          )}
          {contact.importStatus === 'complete' && (
            <Button variant="outline" onClick={handleOpenImportDialog}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-import
            </Button>
          )}
          {!contact.linkedinUrl && contact.importStatus !== 'complete' && (
            <Button variant="outline" onClick={handleOpenImportDialog}>
              <Download className="mr-2 h-4 w-4" />
              Import from LinkedIn
            </Button>
          )}

          <Button onClick={() => setShowAddRelationshipDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Relationship
          </Button>
          <Button variant="outline" onClick={() => setShowEditDialog(true)}>
            Edit Contact
          </Button>
        </div>
      </div>

      {/* Opportunity Card - Prominent at the top */}
      {contact.opportunity && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Lightbulb className="h-5 w-5" />
              Opportunity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-900 dark:text-amber-100">{contact.opportunity}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <Card>
            {/* Banner Image */}
            {contact.bannerImageUrl && (
              <div className="relative w-full h-32 bg-gradient-to-r from-blue-500 to-purple-600">
                <img
                  src={contact.bannerImageUrl}
                  alt={`${contact.name} banner`}
                  className="w-full h-32 object-cover"
                />
              </div>
            )}
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-2xl">{contact.name}</CardTitle>
                    {(contact.followers || contact.connections) && (
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {contact.followers && (
                          <span>{contact.followers.toLocaleString()} followers</span>
                        )}
                        {contact.connections && (
                          <span>{contact.connections.toLocaleString()} connections</span>
                        )}
                      </div>
                    )}
                  </div>
                  <CardDescription>
                    {contact.role && contact.company && `${contact.role} at ${contact.company}`}
                    {contact.role && !contact.company && contact.role}
                    {!contact.role && contact.company && contact.company}
                  </CardDescription>
                  {(contact.city || contact.countryCode) && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>
                        {contact.city && contact.countryCode && `${contact.city}, ${contact.countryCode}`}
                        {contact.city && !contact.countryCode && contact.city}
                        {!contact.city && contact.countryCode && contact.countryCode}
                      </span>
                    </div>
                  )}
                </div>
                {contact.profilePictureUrl && (
                  <img
                    src={contact.profilePictureUrl}
                    alt={contact.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-background -mt-8"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${contact.email}`} className="text-sm hover:underline">
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${contact.phone}`} className="text-sm hover:underline">
                      {contact.phone}
                    </a>
                  </div>
                )}
                {contact.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{contact.location}</span>
                  </div>
                )}
                {contact.telegramUsername && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">@{contact.telegramUsername}</span>
                  </div>
                )}
              </div>

              {/* Social Media Links */}
              {(contact.linkedinUrl || contact.twitterUrl) && (
                <>
                  <Separator />
                  <div className="flex gap-2">
                    {contact.linkedinUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="h-4 w-4 mr-2" />
                          LinkedIn
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                    {contact.twitterUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={contact.twitterUrl} target="_blank" rel="noopener noreferrer">
                          <Twitter className="h-4 w-4 mr-2" />
                          Twitter
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>
                </>
              )}

              {/* Bio Links */}
              {bioLinks && bioLinks.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Links</h4>
                    <div className="flex flex-wrap gap-2">
                      {bioLinks.map((link: any, index: number) => (
                        <Button key={index} variant="outline" size="sm" asChild>
                          <a href={link.link} target="_blank" rel="noopener noreferrer">
                            {link.title || link.link}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Summary/Headline */}
              {contact.summary && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">About</h4>
                    <p className="text-sm text-muted-foreground">{contact.summary}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Experience Card */}
          {experience && experience.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Experience
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {experience.map((exp: any, index: number) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        {exp.companyLogoUrl && (
                          <img
                            src={exp.companyLogoUrl}
                            alt={exp.company}
                            className="w-12 h-12 rounded object-contain bg-gray-50"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium">{exp.title}</h4>
                          <p className="text-sm text-muted-foreground">{exp.company}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {exp.startDate} - {exp.endDate || 'Present'}
                      </span>
                    </div>
                    {exp.description && (
                      <p className="text-sm text-muted-foreground ml-15">{exp.description}</p>
                    )}
                    {index < experience.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Education Card */}
          {education && education.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Education
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {education.map((edu: any, index: number) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        {edu.instituteLogoUrl && (
                          <img
                            src={edu.instituteLogoUrl}
                            alt={edu.school}
                            className="w-12 h-12 rounded object-contain bg-gray-50"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium">{edu.school}</h4>
                          <p className="text-sm text-muted-foreground">
                            {edu.degree} {edu.fieldOfStudy && `in ${edu.fieldOfStudy}`}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {edu.startDate} - {edu.endDate || 'Present'}
                      </span>
                    </div>
                    {index < education.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Skills Card */}
          {skills && skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill: any, index: number) => {
                    // Handle both string skills and object skills {title, subtitle}
                    const skillText = typeof skill === 'string' ? skill : skill?.title || skill?.name || '';
                    if (!skillText) return null;
                    return <Badge key={index} variant="secondary">{skillText}</Badge>;
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Posts & Activity */}
          {posts && posts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Recent Posts
                </CardTitle>
                <CardDescription>Latest activity on LinkedIn</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {posts.slice(0, 5).map((post: any, index: number) => (
                  <div key={index} className="space-y-2">
                    {post.title && (
                      <p className="text-sm font-medium">{post.title}</p>
                    )}
                    {post.attribution && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{post.attribution}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {post.createdAt && (
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      )}
                      {post.interaction && <span>{post.interaction}</span>}
                    </div>
                    {post.link && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={post.link} target="_blank" rel="noopener noreferrer">
                          View Post
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                    {index < Math.min(posts.length, 5) - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* People Also Viewed - Network Suggestions */}
          {peopleAlsoViewed && peopleAlsoViewed.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  People Also Viewed
                </CardTitle>
                <CardDescription>Potential connections in their network</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {peopleAlsoViewed.slice(0, 6).map((person: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-2 border rounded-lg hover:bg-accent/50 transition-colors">
                    {person.profilePicture && (
                      <img
                        src={person.profilePicture}
                        alt={person.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{person.name}</p>
                      {person.headline && (
                        <p className="text-xs text-muted-foreground truncate">{person.headline}</p>
                      )}
                    </div>
                    {person.profileLink && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={person.profileLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Relationships Card */}
          {relationships && relationships.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Relationships ({relationships.length})</CardTitle>
                <CardDescription>Connections in your network</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {relationships.map((rel: any) => (
                  <div key={rel.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <button
                          onClick={() => setLocation(`/contacts/${rel.relatedContact.id}`)}
                          className="font-medium hover:underline text-left"
                        >
                          {rel.relatedContact.name}
                        </button>
                        <p className="text-sm text-muted-foreground">
                          {rel.direction === 'outgoing' ? rel.relationshipType.replace(/_/g, ' ') : `${rel.relationshipType.replace(/_/g, ' ')} (reverse)`}
                        </p>
                        {rel.relatedContact.company && (
                          <p className="text-xs text-muted-foreground">{rel.relatedContact.company}</p>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setLocation(`/contacts/${rel.relatedContact.id}`)}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Conversation Summary */}
          {contact.conversationSummary && (
            <Card>
              <CardHeader>
                <CardTitle>Conversation Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {contact.conversationSummary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action Items */}
          {contact.actionItems && (
            <Card>
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {contact.actionItems}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {contact.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {contact.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact.sentiment && (
                <div>
                  <div className="text-sm font-medium mb-1">Sentiment</div>
                  <Badge variant="secondary">{contact.sentiment}</Badge>
                </div>
              )}
              {contact.interestLevel && (
                <div>
                  <div className="text-sm font-medium mb-1">Interest Level</div>
                  <Badge variant="secondary">{contact.interestLevel}</Badge>
                </div>
              )}
              <Separator />
              <div>
                <div className="text-sm font-medium mb-1">Added</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(contact.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Last Updated</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(contact.updatedAt).toLocaleDateString()}
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/graph">
                  <Building2 className="mr-2 h-4 w-4" />
                  View in graph
                </Link>
              </Button>
              {contact.email && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`mailto:${contact.email}`}>
                    <Mail className="mr-2 h-4 w-4" />
                    Send email
                  </a>
                </Button>
              )}
              <Separator className="my-3" />
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete contact
              </Button>
            </CardContent>
          </Card>

          {/* Semantic Data */}
          <Card>
            <CardHeader className="pb-3">
              <button
                onClick={() => setShowSemanticData(!showSemanticData)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <CardTitle className="text-base">Semantic Data</CardTitle>
                  {semanticData && (
                    <Badge variant="secondary" className="text-xs">
                      {semanticData.tripleCount} triples
                    </Badge>
                  )}
                </div>
                {showSemanticData ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            {showSemanticData && (
              <CardContent className="pt-0">
                {semanticData && semanticData.tripleCount > 0 ? (
                  <div className="space-y-3">
                    {/* Group triples by predicate type */}
                    {Object.entries(semanticData.grouped || {}).slice(0, 8).map(([predicate, triples]) => (
                      <div key={predicate} className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {predicate}
                        </div>
                        <div className="space-y-0.5">
                          {(triples as any[]).slice(0, 3).map((triple: any, idx: number) => (
                            <div key={idx} className="text-sm truncate" title={triple.object}>
                              {triple.objectType === 'uri' ? (
                                <span className="text-blue-600">{triple.object.split('/').pop() || triple.object}</span>
                              ) : (
                                triple.object
                              )}
                            </div>
                          ))}
                          {(triples as any[]).length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{(triples as any[]).length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {Object.keys(semanticData.grouped || {}).length > 8 && (
                      <div className="text-xs text-muted-foreground pt-2">
                        +{Object.keys(semanticData.grouped || {}).length - 8} more properties
                      </div>
                    )}
                    <Separator className="my-2" />
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link href={`/semantic-graph?contact=${contactId}`}>
                        <Database className="mr-2 h-3 w-3" />
                        View Full Graph
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No semantic data available.
                    {!contact.linkedinUrl && " Import from LinkedIn to generate."}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      <AddRelationshipDialog
        open={showAddRelationshipDialog}
        onOpenChange={setShowAddRelationshipDialog}
        onSuccess={handleRelationshipSuccess}
      />
      
      <EditContactDialog
        contact={contact}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={() => {
          refetch();
          refetchRelationships();
        }}
      />

      {/* Import from LinkedIn Dialog */}
      <Dialog open={showImportDialog} onOpenChange={handleCloseImportDialog}>
        <DialogContent className="sm:max-w-[500px]">
          {importStep === 'provider' && (
            <>
              <DialogHeader>
                <DialogTitle>Import from LinkedIn</DialogTitle>
                <DialogDescription>
                  Fetch profile data from LinkedIn to enhance this contact
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="linkedin-url">LinkedIn Profile URL</Label>
                  <Input
                    id="linkedin-url"
                    placeholder="https://www.linkedin.com/in/username"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                  />
                </div>

                {availableProviders && availableProviders.length > 1 && (
                  <div className="space-y-3">
                    <Label>Choose provider</Label>
                    <RadioGroup
                      value={selectedProvider}
                      onValueChange={(value) => setSelectedProvider(value as 'scrapingdog' | 'brightdata')}
                    >
                      {availableProviders.map((provider) => (
                        <div key={provider.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={provider.id} id={provider.id} />
                          <Label htmlFor={provider.id} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <span>{provider.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {provider.speed === 'fast' ? 'Fast ~5-10s' : 'Slower ~30-60s'}
                              </Badge>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseImportDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={handleFetchPreview}
                  disabled={!linkedinUrl.trim()}
                >
                  Fetch Profile
                </Button>
              </DialogFooter>
            </>
          )}

          {importStep === 'loading' && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {getImportPreviewMutation.isPending ? 'Fetching profile...' : 'Importing data...'}
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {getImportPreviewMutation.isPending
                    ? `Fetching data from ${selectedProvider === 'scrapingdog' ? 'Scrapingdog' : 'Bright Data'}...`
                    : 'Saving imported data...'}
                </p>
              </div>
            </>
          )}

          {importStep === 'preview' && previewData && (
            <>
              <DialogHeader>
                <DialogTitle>Preview Import</DialogTitle>
                <DialogDescription>
                  Review the data before importing
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  {previewData.profilePictureUrl && (
                    <img
                      src={previewData.profilePictureUrl}
                      alt={previewData.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-lg">{previewData.name || previewData.firstName + ' ' + previewData.lastName}</h4>
                    {previewData.headline && (
                      <p className="text-sm text-muted-foreground truncate">{previewData.headline}</p>
                    )}
                    {(previewData.currentCompany || previewData.currentRole) && (
                      <p className="text-sm">
                        {previewData.currentRole && <span>{previewData.currentRole}</span>}
                        {previewData.currentRole && previewData.currentCompany && <span> at </span>}
                        {previewData.currentCompany && <span className="font-medium">{previewData.currentCompany}</span>}
                      </p>
                    )}
                    {previewData.location && (
                      <p className="text-xs text-muted-foreground mt-1">{previewData.location}</p>
                    )}
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      {previewData.followers && (
                        <span>{previewData.followers.toLocaleString()} followers</span>
                      )}
                      {previewData.connections && (
                        <span>{previewData.connections.toLocaleString()} connections</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="import-company"
                    checked={importCompany}
                    onChange={(e) => setImportCompany(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="import-company" className="text-sm">
                    Also import company data
                  </Label>
                </div>

                <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  <p className="font-medium mb-1">This import includes:</p>
                  <ul className="space-y-1 text-xs">
                    {previewData._rawData?.experience?.length > 0 && (
                      <li>• {previewData._rawData.experience.length} work experiences</li>
                    )}
                    {previewData._rawData?.education?.length > 0 && (
                      <li>• {previewData._rawData.education.length} education entries</li>
                    )}
                    {previewData._rawData?.skills?.length > 0 && (
                      <li>• {previewData._rawData.skills.length} skills</li>
                    )}
                    {previewData._rawData?.posts?.length > 0 && (
                      <li>• {previewData._rawData.posts.length} recent posts</li>
                    )}
                  </ul>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setImportStep('provider')}>
                  Back
                </Button>
                <Button onClick={handleConfirmImport}>
                  <Download className="mr-2 h-4 w-4" />
                  Import This Data
                </Button>
              </DialogFooter>
            </>
          )}

          {importStep === 'success' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Import Complete
                </DialogTitle>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Successfully imported LinkedIn profile data for {contact.name}.
                </p>
                {previewData?._rawData && (
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <p className="font-medium mb-1">Imported:</p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {previewData._rawData?.experience?.length > 0 && (
                        <li>• {previewData._rawData.experience.length} work experiences</li>
                      )}
                      {previewData._rawData?.education?.length > 0 && (
                        <li>• {previewData._rawData.education.length} education entries</li>
                      )}
                      {previewData._rawData?.skills?.length > 0 && (
                        <li>• {previewData._rawData.skills.length} skills</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button onClick={handleCloseImportDialog}>
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {contact.name} and all their relationships. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteContactMutation.mutate({ id: contactId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteContactMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
