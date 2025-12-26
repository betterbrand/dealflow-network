import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail,
  Phone,
  MapPin,
  Building2,
  Linkedin,
  Twitter,
  Briefcase,
  GraduationCap,
  Users,
  RefreshCw,
  Loader2,
  CheckCircle,
  Save,
  Edit2,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({});

  const utils = trpc.useUtils();
  const { data: profile, isLoading, refetch } = trpc.auth.getProfile.useQuery();

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.getProfile.invalidate();
      utils.auth.me.invalidate();
      setIsEditing(false);
    },
  });

  const importLinkedInMutation = trpc.auth.importLinkedInProfile.useMutation({
    onSuccess: () => {
      utils.auth.getProfile.invalidate();
      utils.auth.me.invalidate();
      setShowImportDialog(false);
    },
  });

  // Parse JSON fields
  const experience = profile?.experience ? JSON.parse(profile.experience) : [];
  const education = profile?.education ? JSON.parse(profile.education) : [];
  const skills = profile?.skills ? JSON.parse(profile.skills) : [];
  const bioLinks = profile?.bioLinks ? JSON.parse(profile.bioLinks) : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          Loading your profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-muted-foreground">
          Profile not found. Please log in again.
        </div>
      </div>
    );
  }

  const handleStartEdit = () => {
    setFormData({
      name: profile.name || "",
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      phone: profile.phone || "",
      telegramUsername: profile.telegramUsername || "",
      company: profile.company || "",
      jobTitle: profile.jobTitle || "",
      location: profile.location || "",
      linkedinUrl: profile.linkedinUrl || "",
      twitterUrl: profile.twitterUrl || "",
      bio: profile.bio || "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleImportLinkedIn = () => {
    if (!linkedinUrl.trim()) return;
    importLinkedInMutation.mutate({ linkedinUrl: linkedinUrl.trim() });
  };

  const handleOpenImportDialog = () => {
    setLinkedinUrl(profile.linkedinUrl || "");
    setShowImportDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">
            Your professional profile and network center
          </p>
        </div>
        <div className="flex gap-2">
          {!isEditing && (
            <>
              <Button variant="outline" onClick={handleOpenImportDialog}>
                <Linkedin className="mr-2 h-4 w-4" />
                Import from LinkedIn
              </Button>
              <Button onClick={handleStartEdit}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </>
          )}
          {isEditing && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              {profile.profilePictureUrl ? (
                <img
                  src={profile.profilePictureUrl}
                  alt={profile.name || "Profile"}
                  className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-4xl font-semibold">
                  {(profile.name || profile.email || "?")[0].toUpperCase()}
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="flex-1 space-y-4">
              {isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      value={formData.firstName || ""}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={formData.lastName || ""}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Input
                      value={formData.company || ""}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Job Title</Label>
                    <Input
                      value={formData.jobTitle || ""}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={formData.location || ""}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Bio</Label>
                    <Textarea
                      value={formData.bio || ""}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>LinkedIn URL</Label>
                    <Input
                      value={formData.linkedinUrl || ""}
                      onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Twitter URL</Label>
                    <Input
                      value={formData.twitterUrl || ""}
                      onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-2xl font-semibold">
                      {profile.name || profile.email}
                    </h2>
                    {profile.jobTitle && (
                      <p className="text-lg text-muted-foreground">
                        {profile.jobTitle}
                        {profile.company && ` at ${profile.company}`}
                      </p>
                    )}
                  </div>

                  {profile.bio && (
                    <p className="text-muted-foreground">{profile.bio}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm">
                    {profile.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        {profile.email}
                      </div>
                    )}
                    {profile.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {profile.phone}
                      </div>
                    )}
                    {profile.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {profile.location}
                      </div>
                    )}
                    {profile.company && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        {profile.company}
                      </div>
                    )}
                  </div>

                  {/* Social Links */}
                  <div className="flex gap-3">
                    {profile.linkedinUrl && (
                      <a
                        href={profile.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Linkedin className="h-5 w-5" />
                      </a>
                    )}
                    {profile.twitterUrl && (
                      <a
                        href={profile.twitterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-500 hover:text-sky-600"
                      >
                        <Twitter className="h-5 w-5" />
                      </a>
                    )}
                  </div>

                  {/* Stats */}
                  {(profile.followers || profile.connections) && (
                    <div className="flex gap-6 pt-2">
                      {profile.followers && (
                        <div>
                          <span className="font-semibold">{profile.followers.toLocaleString()}</span>
                          <span className="text-muted-foreground ml-1">followers</span>
                        </div>
                      )}
                      {profile.connections && (
                        <div>
                          <span className="font-semibold">{profile.connections.toLocaleString()}</span>
                          <span className="text-muted-foreground ml-1">connections</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Experience */}
      {experience.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Experience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {experience.map((exp: any, idx: number) => (
                <div key={idx} className="flex gap-4">
                  {exp.companyLogoUrl && (
                    <img
                      src={exp.companyLogoUrl}
                      alt={exp.company}
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  <div>
                    <h4 className="font-medium">{exp.title}</h4>
                    <p className="text-sm text-muted-foreground">{exp.company}</p>
                    <p className="text-xs text-muted-foreground">
                      {exp.duration || `${exp.startDate || ""} - ${exp.endDate || "Present"}`}
                    </p>
                    {exp.description && (
                      <p className="text-sm mt-1">{exp.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Education */}
      {education.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Education
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {education.map((edu: any, idx: number) => (
                <div key={idx} className="flex gap-4">
                  {edu.schoolLogoUrl && (
                    <img
                      src={edu.schoolLogoUrl}
                      alt={edu.school}
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  <div>
                    <h4 className="font-medium">{edu.school}</h4>
                    <p className="text-sm text-muted-foreground">
                      {edu.degree}
                      {edu.fieldOfStudy && `, ${edu.fieldOfStudy}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {edu.startDate} - {edu.endDate || "Present"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill: string | { name: string }, idx: number) => (
                <Badge key={idx} variant="secondary">
                  {typeof skill === "string" ? skill : skill.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bio Links */}
      {bioLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bioLinks.map((link: { title: string; link: string }, idx: number) => (
                <a
                  key={idx}
                  href={link.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  {link.title || link.link}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import LinkedIn Profile</DialogTitle>
            <DialogDescription>
              Enter your LinkedIn profile URL to import your professional data.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>LinkedIn Profile URL</Label>
            <Input
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImportLinkedIn}
              disabled={!linkedinUrl.trim() || importLinkedInMutation.isPending}
            >
              {importLinkedInMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Import Profile
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
