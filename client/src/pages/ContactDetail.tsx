import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, MapPin, Building2, Calendar, User, Linkedin, Twitter, Plus, ExternalLink, Briefcase, GraduationCap, FileText, Users } from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { AddRelationshipDialog } from "@/components/AddRelationshipDialog";
import { EditContactDialog } from "@/components/EditContactDialog";

export default function ContactDetail() {
  const params = useParams();
  const contactId = params.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const [showAddRelationshipDialog, setShowAddRelationshipDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const { data: contact, isLoading, refetch } = trpc.contacts.get.useQuery({ id: contactId });
  const { data: relationships, refetch: refetchRelationships } = trpc.relationships.getForContact.useQuery({ contactId });

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
        <div className="flex gap-2">
          <Button onClick={() => setShowAddRelationshipDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Relationship
          </Button>
          <Button variant="outline" onClick={() => setShowEditDialog(true)}>
            Edit Contact
          </Button>
        </div>
      </div>

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
                    {post.text && (
                      <p className="text-sm line-clamp-3">{post.text}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {post.date && (
                        <span>{new Date(post.date).toLocaleDateString()}</span>
                      )}
                      {post.likes && <span>{post.likes} likes</span>}
                      {post.comments && <span>{post.comments} comments</span>}
                    </div>
                    {post.url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={post.url} target="_blank" rel="noopener noreferrer">
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
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/graph">
                  <Building2 className="mr-2 h-4 w-4" />
                  View in Graph
                </Link>
              </Button>
              {contact.email && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`mailto:${contact.email}`}>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Email
                  </a>
                </Button>
              )}
            </CardContent>
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
    </div>
  );
}
