'use client'

import React from 'react'
import { 
  TrendingUp, 
  Users, 
  Workflow, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Play,
  Pause,
  CheckCircle
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const stats = [
  {
    name: 'Active Workflows',
    value: '12',
    change: '+2.5%',
    changeType: 'increase',
    icon: Workflow
  },
  {
    name: 'Tasks Completed',
    value: '1,247',
    change: '+12.3%',
    changeType: 'increase',
    icon: CheckCircle
  },
  {
    name: 'Time Saved',
    value: '48.2h',
    change: '+8.1%',
    changeType: 'increase',
    icon: Clock
  },
  {
    name: 'Team Members',
    value: '8',
    change: '+1',
    changeType: 'increase',
    icon: Users
  }
]

const recentWorkflows = [
  {
    id: 1,
    name: 'Client Onboarding',
    status: 'running',
    lastRun: '2 hours ago',
    success: 98
  },
  {
    id: 2,
    name: 'Invoice Processing',
    status: 'paused',
    lastRun: '1 day ago',
    success: 95
  },
  {
    id: 3,
    name: 'Document Review',
    status: 'running',
    lastRun: '30 minutes ago',
    success: 92
  }
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your workflows.</p>
        </div>
        <Button>
          Create Workflow
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <div className="flex items-center mt-2">
                  {stat.changeType === 'increase' ? (
                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm ml-1 ${
                    stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-primary-50 rounded-lg">
                <stat.icon className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Workflows */}
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Workflows</h2>
            <Button variant="outline" size="sm">View All</Button>
          </div>
          <div className="space-y-4">
            {recentWorkflows.map((workflow) => (
              <div key={workflow.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    workflow.status === 'running' ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    {workflow.status === 'running' ? (
                      <Play className="w-4 h-4 text-green-600" />
                    ) : (
                      <Pause className="w-4 h-4 text-yellow-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{workflow.name}</p>
                    <p className="text-sm text-gray-500">Last run: {workflow.lastRun}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{workflow.success}%</p>
                  <p className="text-xs text-gray-500">Success rate</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Workflow className="w-4 h-4 mr-2" />
              Create New Workflow
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Invite Team Member
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <TrendingUp className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}