"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import {
  getHealthRecords,
  deleteHealthRecord,
  getHealthStats,
} from "@/lib/health-records";
import { AccessibilityProvider } from "@/components/accessibility-provider";
import {
  Activity,
  Brain,
  Heart,
  Mic,
  Camera,
  MessageCircle,
  Calendar,
  TrendingUp,
  Filter,
  Search,
  Trash2,
  Eye,
  ArrowLeft,
  Download,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HealthRecord {
  id: string;
  type: string;
  title: string;
  data: any;
  analysis_result: any;
  confidence_level: number | null;
  urgency_level: string | null;
  created_at: string;
}

export default function HealthRecordsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<HealthRecord[]>([]);
  const [healthStats, setHealthStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(
    null
  );

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }
    loadData();
  }, [user, router]);

  // Refresh data when page becomes visible (e.g., navigating back from another page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        loadData();
      }
    };

    const handlePageShow = () => {
      if (user) {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [records, filter, searchQuery]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [recordsData, statsData] = await Promise.all([
        getHealthRecords(),
        getHealthStats(),
      ]);
      setRecords(recordsData);
      setHealthStats(statsData);
    } catch (error) {
      console.error("Error loading health data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = records;

    // Apply type filter
    if (filter !== "all") {
      filtered = filtered.filter((record) => record.type === filter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.title.toLowerCase().includes(query) ||
          (record.analysis_result?.analysis || "").toLowerCase().includes(query)
      );
    }

    setFilteredRecords(filtered);
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm("Are you sure you want to delete this health record?")) {
      return;
    }

    try {
      await deleteHealthRecord(recordId);
      
      // Remove from local state
      const updatedRecords = records.filter((r) => r.id !== recordId);
      setRecords(updatedRecords);
      
      // Update filtered records immediately
      const newFilteredRecords = updatedRecords.filter((record) => {
        // Apply current filters to the updated records
        if (filter !== "all" && record.type !== filter) {
          return false;
        }
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          return (
            record.title.toLowerCase().includes(query) ||
            (record.analysis_result?.analysis || "").toLowerCase().includes(query)
          );
        }
        return true;
      });
      setFilteredRecords(newFilteredRecords);
      
      // Refresh health stats to update counts
      const updatedStats = await getHealthStats();
      setHealthStats(updatedStats);
    } catch (error) {
      console.error("Error deleting record:", error);
      alert("Failed to delete record. Please try again.");
    }
  };

  const formatRecordType = (type: string) => {
    const typeMap = {
      skin_analysis: "Skin Analysis",
      voice_log: "Voice Log",
      medication_scan: "Medication Scan",
      chat_session: "Health Chat",
    };
    return typeMap[type as keyof typeof typeMap] || type;
  };

  const getRecordIcon = (type: string) => {
    const iconMap = {
      skin_analysis: Camera,
      voice_log: Mic,
      medication_scan: Activity,
      chat_session: MessageCircle,
    };
    const Icon = iconMap[type as keyof typeof iconMap] || Activity;
    return Icon;
  };

  const getUrgencyColor = (urgency: string | null) => {
    switch (urgency) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(records, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `health-records-${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return null;
  }

  return (
    <AccessibilityProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">

        {/* Header */}
        <header className="bg-white dark:bg-gray-900 shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <Link href="/">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Health Records
                </h1>
              </div>

              <div className="flex items-center space-x-2">
                <Button onClick={exportData} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Statistics Overview */}
          {healthStats && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Your Health Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {healthStats.totalRecords || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total Records</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {healthStats.skinAnalyses || 0}
                    </div>
                    <div className="text-sm text-gray-600">Skin Analyses</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {healthStats.voiceLogs || 0}
                    </div>
                    <div className="text-sm text-gray-600">Voice Logs</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-orange-600">
                      {healthStats.medicationScans || 0}
                    </div>
                    <div className="text-sm text-gray-600">
                      Medication Scans
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Filters and Search */}
          <div className="mb-6 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="all">All Records</option>
                <option value="skin_analysis">Skin Analysis</option>
                <option value="voice_log">Voice Logs</option>
                <option value="medication_scan">Medication Scans</option>
                <option value="chat_session">Health Chats</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 flex-1">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600"
              />
            </div>
          </div>

          {/* Records List */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">
                Loading your health records...
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Records Found
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {searchQuery || filter !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "Start using MediVision Assistant to track your health journey."}
                </p>
                <Link href="/">
                  <Button>Start Health Analysis</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record) => {
                const Icon = getRecordIcon(record.type);
                return (
                  <Card
                    key={record.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Icon className="w-5 h-5 text-blue-600" />
                          <div>
                            <CardTitle className="text-lg">
                              {record.title}
                            </CardTitle>
                            <CardDescription>
                              {formatRecordType(record.type)} •{" "}
                              {new Date(record.created_at).toLocaleDateString()}{" "}
                              at{" "}
                              {new Date(record.created_at).toLocaleTimeString()}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={getUrgencyColor(record.urgency_level)}
                          >
                            {record.urgency_level || "normal"}
                          </Badge>
                          {record.confidence_level && (
                            <Badge variant="outline">
                              {Math.round(record.confidence_level)}% confidence
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {record.analysis_result?.analysis && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                            {record.analysis_result.analysis}
                          </p>
                        </div>
                      )}

                      {record.analysis_result?.recommendations && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                            Recommendations:
                          </h4>
                          <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
                            {record.analysis_result.recommendations
                              .slice(0, 3)
                              .map((rec: string, idx: number) => (
                                <li key={idx} className="line-clamp-1">
                                  {rec}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="text-xs text-gray-500">
                          Record ID: {record.id.slice(0, 8)}...
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRecord(record)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRecord(record.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Record Detail Modal */}
          {selectedRecord && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{selectedRecord.title}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRecord(null)}
                    >
                      ×
                    </Button>
                  </div>
                  <CardDescription>
                    {formatRecordType(selectedRecord.type)} •{" "}
                    {new Date(selectedRecord.created_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedRecord.analysis_result?.analysis && (
                    <div>
                      <h4 className="font-medium mb-2">Analysis:</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {selectedRecord.analysis_result.analysis}
                      </p>
                    </div>
                  )}

                  {selectedRecord.analysis_result?.recommendations && (
                    <div>
                      <h4 className="font-medium mb-2">Recommendations:</h4>
                      <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside space-y-1">
                        {selectedRecord.analysis_result.recommendations.map(
                          (rec: string, idx: number) => (
                            <li key={idx}>{rec}</li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                  {selectedRecord.analysis_result?.followUpQuestions && (
                    <div>
                      <h4 className="font-medium mb-2">Follow-up Questions:</h4>
                      <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside space-y-1">
                        {selectedRecord.analysis_result.followUpQuestions.map(
                          (q: string, idx: number) => (
                            <li key={idx}>{q}</li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {selectedRecord.confidence_level && (
                      <span>
                        Confidence:{" "}
                        {Math.round(selectedRecord.confidence_level)}%
                      </span>
                    )}
                    <span>
                      Urgency: {selectedRecord.urgency_level || "normal"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </AccessibilityProvider>
  );
}
