'use client'

import React, { useState } from 'react'
import { 
  Plus, 
  Search, 
  Filter, 
  Play, 
  Pause, 
  Edit, 
  Trash2,
  MoreHorizontal,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'

const workflows = [
  {
    id: 1,
    name: 'Client Onboarding',
    description: 'Automated client onboarding process with document collection and setup',
    status: 'active',
    lastRun: '2 hours ago',
    successRate: 98,
    totalRuns: 156,
    category: 'Client Management'
  },
  {
    id: 2,
    name: 'Invoice Processing',
    description: 'Automated invoice generation and payment tracking',
    status: 'paused',
    lastRun: '1 day ago',
    successRate: 95,
    totalRuns: 89,
    category: 'Finance'
  },
  {
    id: 3,
    name: 'Document Review',
    description: 'AI-powered document review and approval workflow',
    status: 'active',
    lastRun: '30 minutes ago',
    successRate: 92,
    totalRuns: 234,
    category: 'Legal'
  },
  {
    id: 4,
    name: 'Lead Qualification',
    description: 'Automated lead scoring and qualification process',
    status: 'draft',
    lastRun: 'Never',
    successRate: 0,
    totalRuns: 0,
    category: 'Sales'
  }
]

export default function WorkflowsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />
      case 'paused':
        return <Pause className="w-4 h-4" />
      case 'draft':
        return <Clock className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || workflow.category.toLowerCase() === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-600 mt-1">Manage and monitor your automated workflows</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search workflows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Categories</option>
          <option value="client management">Client Management</option>
          <option value="finance">Finance</option>
          <option value="legal">Legal</option>
          <option value="sales">Sales</option>
        </select>
      </div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorkflows.map((workflow) => (
          <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {workflow.name}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  {workflow.description}
                </p>
                <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  {workflow.category}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(workflow.status)}`}>
                  {getStatusIcon(workflow.status)}
                  <span className="ml-1 capitalize">{workflow.status}</span>
                </span>
                <button className="p-1 text-gray-400 hover:text-gray-600">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Last run:</span>
                <span className="text-gray-900">{workflow.lastRun}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Success rate:</span>
                <span className="text-gray-900">{workflow.successRate}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total runs:</span>
                <span className="text-gray-900">{workflow.totalRuns}</span>
              </div>
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
              <div className="flex space-x-2">
                {workflow.status === 'active' ? (
                  <Button size="sm" variant="outline">
                    <Pause className="w-4 h-4 mr-1" />
                    Pause
                  </Button>
                ) : (
                  <Button size="sm" variant="outline">
                    <Play className="w-4 h-4 mr-1" />
                    Run
                  </Button>
                )}
                <Button size="sm" variant="outline">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
              <Button size="sm" variant="ghost">
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Workflow Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Workflow"
        size="lg"
      >
        <div className="space-y-6">
          <Input
            label="Workflow Name"
            placeholder="Enter workflow name"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              placeholder="Describe what this workflow does"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Select a category</option>
              <option value="client-management">Client Management</option>
              <option value="finance">Finance</option>
              <option value="legal">Legal</option>
              <option value="sales">Sales</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsCreateModalOpen(false)}>
              Create Workflow
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}