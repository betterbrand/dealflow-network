import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, MapPin, Building2, Calendar, User } from "lucide-react";
import { Link, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function ContactDetail() {
  const params = useParams();
  const contactId = params.id ? parseInt(params.id) : 0;
  
  const { data: contact, isLoading } = trpc.contacts.get.useQuery({ id: contactId });

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
        <Button variant="outline" disabled>
          Edit Contact
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{contact.name}</CardTitle>
              <CardDescription>
                {contact.role && contact.company && `${contact.role} at ${contact.company}`}
                {contact.role && !contact.company && contact.role}
                {!contact.role && contact.company && contact.company}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{contact.phone}</span>
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
            </CardContent>
          </Card>

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
        </div>
      </div>
    </div>
  );
}
