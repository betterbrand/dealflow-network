import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MapPin,
  Globe,
  Linkedin,
  Users,
  Calendar,
  TrendingUp,
  ArrowLeft,
  Mail,
  Briefcase,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CompanyDetail() {
  const [, params] = useRoute("/companies/:id");
  const [, setLocation] = useLocation();
  const companyId = params?.id ? parseInt(params.id) : 0;

  const { data: company, isLoading } = trpc.companies.getWithContacts.useQuery(
    { id: companyId },
    { enabled: companyId > 0 }
  );

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-muted-foreground">Loading company...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Company not found</h3>
            <p className="text-muted-foreground mb-4">
              The company you're looking for doesn't exist
            </p>
            <Button onClick={() => setLocation("/companies")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Companies
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Button
        variant="ghost"
        onClick={() => setLocation("/companies")}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Companies
      </Button>

      {/* Company Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name}
                className="h-24 w-24 rounded-lg object-cover"
              />
            ) : (
              <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center">
                <Building2 className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{company.name}</h1>
                  {company.type && (
                    <Badge variant="secondary" className="mb-3">
                      {company.type}
                    </Badge>
                  )}
                  {company.description && (
                    <p className="text-muted-foreground max-w-2xl">
                      {company.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {company.industry && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{company.industry}</span>
                  </div>
                )}
                {company.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{company.location}</span>
                  </div>
                )}
                {company.size && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{company.size}</span>
                  </div>
                )}
                {company.foundedYear && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Founded {company.foundedYear}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-4">
                {company.website && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Website
                    </a>
                  </Button>
                )}
                {company.linkedinUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={company.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Linkedin className="h-4 w-4 mr-2" />
                      LinkedIn
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Network Contacts
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{company.contactCount}</div>
            <p className="text-xs text-muted-foreground">
              People in your network
            </p>
          </CardContent>
        </Card>

        {company.fundingStage && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Funding Stage
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{company.fundingStage}</div>
              <p className="text-xs text-muted-foreground">Current stage</p>
            </CardContent>
          </Card>
        )}

        {company.employeeCount && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {company.employeeCount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Team size</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Contacts at Company */}
      <Card>
        <CardHeader>
          <CardTitle>Contacts at {company.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {company.contacts && company.contacts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {contact.profilePictureUrl ? (
                          <img
                            src={contact.profilePictureUrl}
                            alt={contact.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {contact.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="font-medium">{contact.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.role || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.location || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.email ? (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/contacts/${contact.id}`)}
                      >
                        View Profile
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No contacts at this company yet
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
